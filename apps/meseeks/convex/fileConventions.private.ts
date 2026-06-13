import { z } from 'zod/v3';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { changedPathSchema } from 'schemas/workspaceSchema';
import {
	actionsDirectoryName,
	proDirectoryName,
	rootPath,
	settingsFileName,
	triggerDirectoryName,
} from './fileConstants.private';
import { insertChangeset } from './changes.private';
import { createFileDirect, createFolderWithRevisionDirect, tagFile } from './files.private';
import { ensureOwnedDirectory } from './ownership.private';
import { findChildByName, normalizeName } from './paths.private';
import { insertRevision, readRevisionContent } from './revisions.private';
import { routeConventionSeeds, type RouteConventionEntry } from './routeConventions.private';
import { now } from './time.private';

type ChangedPath = z.infer<typeof changedPathSchema>;

type CreateTaskArgs = {
	owner: Id<'users'>;
	directory: Id<'files'>;
	name: string;
	body: string;
	bodyStorageKey: string;
	summary?: string;
	summaryStorageKey?: string;
	title?: string;
	settingsStorageKey: string;
	inbox?: boolean;
	budget?: number;
	availableSkillKeys?: string[];
	tags?: Record<string, string>;
	action: Id<'actions'>;
};

type CreateTriggerFileArgs = {
	owner: Id<'users'>;
	directory: Id<'files'>;
	name: string;
	content: string;
	storageKey: string;
	action: Id<'actions'>;
};

export const seedRouteConventions = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		action,
		entries,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		action: Id<'actions'>;
		entries: RouteConventionEntry[];
	},
) => {
	const root = await ensureOwnedDirectory(ctx, { directory, owner });
	if (root.path !== rootPath) throw new Error('Route conventions can only be seeded at the root directory.');

	const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));
	const created: ChangedPath[] = [];

	const ensureConventionFolder = async (parent: Id<'files'>, name: string) => {
		const parentDoc = await ensureOwnedDirectory(ctx, { directory: parent, owner });
		const cleanName = normalizeName(name);
		const existing = await findChildByName(ctx, { owner, parent, name: cleanName });
		if (existing) {
			if (existing.kind !== 'folder') throw new Error(`${existing.path} must be a folder`);
			return existing._id;
		}

		const folder = await createFolderWithRevisionDirect(ctx, {
			owner,
			directory,
			parent: parentDoc,
			name: cleanName,
			action,
		});
		created.push(folder.change);
		return folder.file;
	};

	for (const seed of routeConventionSeeds) {
		const entry = entriesByPath.get(seed.path);
		if (!entry) throw new Error(`Missing route convention body for ${seed.path}.`);

		const parts = seed.path
			.split('/')
			.map((part) => part.trim())
			.filter(Boolean);
		let parent = root._id;
		for (const folderName of parts.slice(0, -1)) {
			parent = await ensureConventionFolder(parent, folderName);
		}

		const parentDoc = await ensureOwnedDirectory(ctx, { directory: parent, owner });
		const fileName = parts[parts.length - 1];
		if (!fileName) throw new Error('Route convention path must include a file name.');

		const existing = await findChildByName(ctx, { owner, parent, name: fileName });
		if (existing) {
			if (existing.kind !== 'file') throw new Error(`${existing.path} must be a file`);
			continue;
		}

		const file = await createFileDirect(ctx, {
			owner,
			directory,
			parent: parentDoc,
			name: fileName,
			content: entry.content,
			storageKey: entry.storageKey,
			contentType: entry.contentType,
			action,
		});
		created.push(file.change);
	}

	if (created.length > 0) {
		await insertChangeset(ctx, {
			owner,
			directory,
			action,
			created,
			updated: [],
		});
	}

	return { changedFiles: created.map((entry) => entry.path) };
};

export const createTask = async (ctx: MutationCtx, args: CreateTaskArgs) => {
	const parent = await ensureOwnedDirectory(ctx, { directory: args.directory, owner: args.owner });
	const cleanName = normalizeName(args.name);
	const existing = await findChildByName(ctx, { owner: args.owner, parent: parent._id, name: cleanName });
	if (existing) throw new Error(`Task already exists at ${existing.path}`);

	const availableSkillKeys = (args.availableSkillKeys ?? []).slice(0, 16);
	const task = await createFolderWithRevisionDirect(ctx, {
		owner: args.owner,
		directory: args.directory,
		parent,
		name: cleanName,
		action: args.action,
		patch: {
			title: args.title ?? cleanName,
			availableSkillKeys,
			budgetTotal: args.budget,
			budgetAvailable: args.budget,
			budgetReserved: args.budget === undefined ? undefined : 0,
		},
	});
	const taskDoc = task.doc;
	const created: ChangedPath[] = [task.change];

	const taskBody = await createFileDirect(ctx, {
		owner: args.owner,
		directory: args.directory,
		parent: taskDoc,
		name: 'Task.md',
		content: args.body,
		storageKey: args.bodyStorageKey,
		action: args.action,
	});
	created.push(taskBody.change);

	if (args.summary) {
		const summary = await createFileDirect(ctx, {
			owner: args.owner,
			directory: args.directory,
			parent: taskDoc,
			name: 'Summary.md',
			content: args.summary,
			storageKey: args.summaryStorageKey ?? args.bodyStorageKey,
			action: args.action,
		});
		created.push(summary.change);
	}

	const proFolder = await createFolderWithRevisionDirect(ctx, {
		owner: args.owner,
		directory: args.directory,
		parent: taskDoc,
		name: proDirectoryName,
		action: args.action,
	});
	const proFolderDoc = proFolder.doc;
	created.push(proFolder.change);

	const settings = await createFileDirect(ctx, {
		owner: args.owner,
		directory: args.directory,
		parent: proFolderDoc,
		name: settingsFileName,
		content: JSON.stringify({ title: args.title ?? cleanName }, null, 2),
		storageKey: args.settingsStorageKey,
		action: args.action,
	});
	created.push(settings.change);

	await tagFile(ctx, {
		owner: args.owner,
		directory: args.directory,
		file: task.file,
		key: 'kind',
		value: 'task',
		action: args.action,
	});
	if (args.inbox) {
		await tagFile(ctx, {
			owner: args.owner,
			directory: args.directory,
			file: task.file,
			key: 'inbox',
			value: 'true',
			action: args.action,
		});
	}
	for (const key of Object.keys(args.tags ?? {})) {
		await tagFile(ctx, {
			owner: args.owner,
			directory: args.directory,
			file: task.file,
			key,
			value: args.tags?.[key],
			action: args.action,
		});
	}

	await insertChangeset(ctx, {
		owner: args.owner,
		directory: args.directory,
		action: args.action,
		created,
		updated: [],
	});

	return { file: task.file, changedFiles: created.map((entry) => entry.path) };
};

export const createTriggerFile = async (ctx: MutationCtx, args: CreateTriggerFileArgs) => {
	const directory = await ensureOwnedDirectory(ctx, { directory: args.directory, owner: args.owner });
	const created: ChangedPath[] = [];

	let pro = await findChildByName(ctx, {
		owner: args.owner,
		parent: directory._id,
		name: proDirectoryName,
	});
	if (!pro) {
		const proFolder = await createFolderWithRevisionDirect(ctx, {
			owner: args.owner,
			directory: args.directory,
			parent: directory,
			name: proDirectoryName,
			action: args.action,
		});
		pro = proFolder.doc;
		created.push(proFolder.change);
	}
	if (pro.kind !== 'folder') throw new Error(`${pro.path} must be a folder`);

	let triggers = await findChildByName(ctx, {
		owner: args.owner,
		parent: pro._id,
		name: triggerDirectoryName,
	});
	if (!triggers) {
		const triggersFolder = await createFolderWithRevisionDirect(ctx, {
			owner: args.owner,
			directory: args.directory,
			parent: pro,
			name: triggerDirectoryName,
			action: args.action,
		});
		triggers = triggersFolder.doc;
		created.push(triggersFolder.change);
	}
	if (triggers.kind !== 'folder') throw new Error(`${triggers.path} must be a folder`);

	const cleanName = normalizeName(args.name);
	const existing = await findChildByName(ctx, { owner: args.owner, parent: triggers._id, name: cleanName });
	if (existing) throw new Error(`Trigger already exists at ${existing.path}`);
	const triggerFile = await createFileDirect(ctx, {
		owner: args.owner,
		directory: args.directory,
		parent: triggers,
		name: cleanName,
		content: args.content,
		storageKey: args.storageKey,
		action: args.action,
	});
	created.push(triggerFile.change);

	await insertChangeset(ctx, {
		owner: args.owner,
		directory: args.directory,
		action: args.action,
		created,
		updated: [],
	});

	return { file: triggerFile.file, changedFiles: created.map((entry) => entry.path) };
};

export const writeActionResultFile = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		action,
		name,
		content,
		storageKey,
		contentType,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		action: Id<'actions'>;
		name: string;
		content: string;
		storageKey: string;
		contentType?: string;
	},
) => {
	const directoryDoc = await ensureOwnedDirectory(ctx, { directory, owner });
	const actionDoc = await ctx.db.get(action);
	if (!actionDoc || actionDoc.owner !== owner || actionDoc.directory !== directory) {
		throw new Error('Action not found.');
	}
	const created: ChangedPath[] = [];

	let pro = await findChildByName(ctx, {
		owner,
		parent: directoryDoc._id,
		name: proDirectoryName,
	});
	if (!pro) {
		const proFolder = await createFolderWithRevisionDirect(ctx, {
			owner,
			directory,
			parent: directoryDoc,
			name: proDirectoryName,
			action,
		});
		pro = proFolder.doc;
		created.push(proFolder.change);
	}
	if (pro.kind !== 'folder') throw new Error(`${pro.path} must be a folder`);

	let actions = await findChildByName(ctx, {
		owner,
		parent: pro._id,
		name: actionsDirectoryName,
	});
	if (!actions) {
		const actionsFolder = await createFolderWithRevisionDirect(ctx, {
			owner,
			directory,
			parent: pro,
			name: actionsDirectoryName,
			action,
		});
		actions = actionsFolder.doc;
		created.push(actionsFolder.change);
	}
	if (actions.kind !== 'folder') throw new Error(`${actions.path} must be a folder`);

	const actionFolderName = actionDoc.index.toString().padStart(6, '0');
	let actionFolder = await findChildByName(ctx, {
		owner,
		parent: actions._id,
		name: actionFolderName,
	});
	if (!actionFolder) {
		const actionResultFolder = await createFolderWithRevisionDirect(ctx, {
			owner,
			directory,
			parent: actions,
			name: actionFolderName,
			action,
		});
		actionFolder = actionResultFolder.doc;
		created.push(actionResultFolder.change);
	}
	if (actionFolder.kind !== 'folder') throw new Error(`${actionFolder.path} must be a folder`);

	const cleanName = normalizeName(name);
	const existing = await findChildByName(ctx, {
		owner,
		parent: actionFolder._id,
		name: cleanName,
	});
	let resultFileId: Id<'files'>;
	let previousStorageKey: string | undefined;
	if (existing) {
		if (existing.kind !== 'file') throw new Error(`${existing.path} must be a file`);
		const beforeContent = await readRevisionContent(ctx, existing.currentRevision);
		const previousRevision = existing.currentRevision ? await ctx.db.get(existing.currentRevision) : null;
		previousStorageKey = previousRevision?.storageKey;
		const revision = await insertRevision(ctx, {
			owner,
			file: existing._id,
			directory,
			action,
			content,
			storageKey,
			contentType: contentType ?? existing.contentType,
			previousRevision: existing.currentRevision,
			beforePath: existing.path,
			afterPath: existing.path,
			beforeContent,
			changeKind: 'updated',
			patchKind: 'text',
		});
		await insertChangeset(ctx, {
			owner,
			directory,
			action,
			created,
			updated: [
				{
					path: existing.path,
					file: existing._id,
					beforeRevision: existing.currentRevision,
					afterRevision: revision,
					beforeContent,
					afterContent: content,
				},
			],
		});
		resultFileId = existing._id;
	} else {
		const result = await createFileDirect(ctx, {
			owner,
			directory,
			parent: actionFolder,
			name: cleanName,
			content,
			storageKey,
			contentType: contentType ?? 'text/mdx; charset=utf-8',
			action,
		});
		created.push(result.change);
		await insertChangeset(ctx, {
			owner,
			directory,
			action,
			created,
			updated: [],
		});
		resultFileId = result.file;
	}

	await ctx.db.patch(action, {
		result: resultFileId,
		updatedAt: now(),
	});
	return {
		file: resultFileId,
		previousStorageKey,
	};
};

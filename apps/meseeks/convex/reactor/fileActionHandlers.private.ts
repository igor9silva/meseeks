'use node';

import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internal } from '../_generated/api';
import { settleAction } from './ledger.private';
import { deleteBodiesBestEffort, storeBody } from './storage.private';
import { runMutationTriggers } from './triggers.private';
import { objectOfStringsArg, textArg } from './utils.private';
import type { StartedAction } from './actionContext.private';

const fileArgSchema = z.object({
	file: zid('files'),
});

const parentArgSchema = z.object({
	parent: zid('files').optional(),
});

const createTaskArgsSchema = z.object({
	name: z.string().min(1),
	body: z.string().default(''),
	summary: z.string().optional(),
	title: z.string().optional(),
	inbox: z.boolean().optional(),
	budget: z.number().nonnegative().optional(),
	availableSkillKeys: z.array(z.string().min(1)).optional(),
	tags: z.record(z.string()).optional(),
});

const runTriggers = async (action: StartedAction, changedPaths: string[]) =>
	await runMutationTriggers(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		sourceAction: action.actionId,
		sourceSkillKey: action.skillKey,
		sourceAuthor: action.author,
		changedPaths,
		depth: action.depth,
	});

const handleCreateFolder = async (action: StartedAction) => {
	const parsed = parentArgSchema.parse(action.args);
	const result = await action.ctx.runMutation(internal.files._ensureFolder, {
		owner: action.owner,
		directory: action.directory,
		parent: parsed.parent ?? action.directory,
		name: textArg(action.args, 'name', 'New folder'),
		action: action.actionId,
	});
	await runTriggers(action, result.changedFiles);
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result: 'Folder created.',
	});
};

const handleCreateFile = async (action: StartedAction) => {
	const parsed = parentArgSchema.parse(action.args);
	const parent = parsed.parent ?? action.directory;
	const name = textArg(action.args, 'name', 'untitled.txt');
	const content = textArg(action.args, 'content');
	const contentType = textArg(action.args, 'contentType', 'text/plain; charset=utf-8');
	const storageKey = await storeBody({
		owner: action.owner,
		actionId: action.actionId,
		content,
		contentType,
	});
	const result = await action.ctx
		.runMutation(internal.files._createFile, {
			owner: action.owner,
			directory: action.directory,
			parent,
			name,
			content,
			storageKey,
			action: action.actionId,
		})
		.catch(async (error: unknown) => {
			await deleteBodiesBestEffort([storageKey]);
			throw error;
		});
	await runTriggers(action, result.changedFiles);
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result: 'File created.',
	});
};

const handleCreateTriggerExample = async (action: StartedAction) => {
	const content = textArg(action.args, 'content');
	const name = textArg(action.args, 'name', 'example.js');
	const storageKey = await storeBody({
		owner: action.owner,
		actionId: action.actionId,
		content,
		contentType: 'text/javascript; charset=utf-8',
	});
	const result = await action.ctx
		.runMutation(internal.files._createTriggerFile, {
			owner: action.owner,
			directory: action.directory,
			name,
			content,
			storageKey,
			action: action.actionId,
		})
		.catch(async (error: unknown) => {
			await deleteBodiesBestEffort([storageKey]);
			throw error;
		});
	await runTriggers(action, result.changedFiles);
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result: 'Trigger file created.',
	});
};

const handleSeedRouteConventions = async (action: StartedAction) => {
	const seeds = await action.ctx.runQuery(internal.files._getRouteConventionStorageEntries, {
		owner: action.owner,
		directory: action.directory,
	});
	const entries = await Promise.all(
		seeds.map(async (seed) => {
			const storageKey = await storeBody({
				owner: action.owner,
				actionId: action.actionId,
				content: seed.content,
				contentType: seed.contentType,
			});
			return {
				...seed,
				storageKey,
			};
		}),
	);
	const result = await action.ctx
		.runMutation(internal.files._seedRouteConventions, {
			owner: action.owner,
			directory: action.directory,
			action: action.actionId,
			entries,
		})
		.catch(async (error: unknown) => {
			await deleteBodiesBestEffort(entries.map((entry) => entry.storageKey));
			throw error;
		});
	await runTriggers(action, result.changedFiles);
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result:
			result.changedFiles.length === 0
				? 'Route conventions already existed.'
				: `Seeded route conventions:\n${result.changedFiles.join('\n')}`,
	});
};

const handleCreateTask = async (action: StartedAction) => {
	const parsed = createTaskArgsSchema.parse(action.args);
	const bodyStorageKey = await storeBody({
		owner: action.owner,
		actionId: action.actionId,
		content: parsed.body,
		contentType: 'text/markdown; charset=utf-8',
	});
	const summaryStorageKey =
		parsed.summary === undefined
			? undefined
			: await storeBody({
					owner: action.owner,
					actionId: action.actionId,
					content: parsed.summary,
					contentType: 'text/markdown; charset=utf-8',
				});
	const settingsContent = JSON.stringify({ title: parsed.title ?? parsed.name }, null, 2);
	const settingsStorageKey = await storeBody({
		owner: action.owner,
		actionId: action.actionId,
		content: settingsContent,
		contentType: 'application/json; charset=utf-8',
	});
	const uploadedStorageKeys = [bodyStorageKey, summaryStorageKey, settingsStorageKey];
	const result = await action.ctx
		.runMutation(internal.files._createTask, {
			owner: action.owner,
			directory: action.directory,
			...parsed,
			bodyStorageKey,
			summaryStorageKey,
			settingsStorageKey,
			action: action.actionId,
		})
		.catch(async (error: unknown) => {
			await deleteBodiesBestEffort(uploadedStorageKeys);
			throw error;
		});
	await runTriggers(action, result.changedFiles);
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result: 'Task created.',
	});
};

const handleWrite = async (action: StartedAction) => {
	const parsed = fileArgSchema.parse(action.args);
	const content = textArg(action.args, 'content');
	const fileInfo = await action.ctx.runQuery(internal.files._getFileContentType, {
		owner: action.owner,
		file: parsed.file,
	});
	const storageKey = await storeBody({
		owner: action.owner,
		actionId: action.actionId,
		content,
		contentType: textArg(action.args, 'contentType', fileInfo.contentType ?? 'text/plain; charset=utf-8'),
	});
	const result = await action.ctx
		.runMutation(internal.files._writeFile, {
			owner: action.owner,
			directory: action.directory,
			file: parsed.file,
			content,
			storageKey,
			action: action.actionId,
		})
		.catch(async (error: unknown) => {
			await deleteBodiesBestEffort([storageKey]);
			throw error;
		});
	if (result.changedFiles.length === 0) {
		await deleteBodiesBestEffort([storageKey]);
	} else {
		await deleteBodiesBestEffort([result.previousStorageKey]);
	}
	await runTriggers(action, result.changedFiles);
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result: 'File written.',
	});
};

const handleUpdateMetadata = async (action: StartedAction) => {
	const parsed = fileArgSchema.parse(action.args);
	const result = await action.ctx.runMutation(internal.files._updateFileMetadata, {
		owner: action.owner,
		directory: action.directory,
		file: parsed.file,
		action: action.actionId,
		metadata: objectOfStringsArg(action.args, 'metadata'),
	});
	await runTriggers(action, result.changedFiles);
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result: 'Metadata updated.',
	});
};

const handleTag = async (action: StartedAction) => {
	const parsed = fileArgSchema.parse(action.args);
	await action.ctx.runMutation(internal.files._tagFile, {
		owner: action.owner,
		directory: action.directory,
		file: parsed.file,
		key: textArg(action.args, 'key', 'tag'),
		value: textArg(action.args, 'value', ''),
		action: action.actionId,
	});
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result: 'Tag updated.',
	});
};

export const handleFileAction = async (action: StartedAction) => {
	if (action.skillKey === 'create' && textArg(action.args, 'kind') === 'folder') {
		await handleCreateFolder(action);
		return true;
	}

	if (action.skillKey === 'create' && textArg(action.args, 'kind', 'file') === 'file') {
		await handleCreateFile(action);
		return true;
	}

	if (action.skillKey === 'createTriggerExample') {
		await handleCreateTriggerExample(action);
		return true;
	}

	if (action.skillKey === 'seedRouteConventions') {
		await handleSeedRouteConventions(action);
		return true;
	}

	if (action.skillKey === 'createTask') {
		await handleCreateTask(action);
		return true;
	}

	if (action.skillKey === 'write') {
		await handleWrite(action);
		return true;
	}

	if (action.skillKey === 'updateFileMetadata') {
		await handleUpdateMetadata(action);
		return true;
	}

	if (action.skillKey === 'tag') {
		await handleTag(action);
		return true;
	}

	return false;
};

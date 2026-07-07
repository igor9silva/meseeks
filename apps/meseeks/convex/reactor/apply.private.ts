import type { Id } from 'convex/_generated/dataModel';
import type { MutationCtx } from 'convex/_generated/server';
import {
	compileMutationSchema,
	fileMutationSchema,
	triggerMutationSchema,
	type CompileMutation,
	type FileMutation,
	type StagedText,
	type TriggerMutation,
} from 'schemas/reactorSchema';
import {
	buildPath,
	createDirectoryForAction,
	createStoredFileForAction,
	createTextFileAtPathForAction,
	createTextFileForAction,
	moveFileForAction,
	tagFileForAction,
	untagFileForAction,
	writeActionOutputFile,
	writeTextFileForAction,
} from '../files.private';
import { replaceCompiledPagesForRoot } from '../pages.private';
import { replaceCompiledSkillsForRoot } from '../skills.private';
import { disableTriggerForAction } from '../triggers.private';
import { replaceCompiledMutationTriggersForRoot } from '../triggers.private';

export async function applyActionOutputFile(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		root: Id<'files'>;
		index: number;
		body: StagedText;
	},
) {
	//
	const file = await writeActionOutputFile(ctx, {
		owner: args.owner,
		action: args.action,
		root: args.root,
		index: args.index,
		content: args.body.content,
		contentType: args.body.contentType,
		hash: args.body.hash,
		size: args.body.size,
		storageKey: args.body.storageKey,
	});

	return {
		file,
		path: await importPath(ctx, file._id),
	};
}

export async function applyFileMutation(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		mutation: FileMutation;
	},
) {
	//
	const mutation = fileMutationSchema.parse(args.mutation);

	if (mutation.kind === 'createDirectory') {
		const file = await createDirectoryForAction(ctx, {
			owner: args.owner,
			action: args.action,
			parent: mutation.parent,
			name: mutation.name,
		});

		return {
			revision: file.currentRevision,
			path: await importPath(ctx, file._id),
		};
	}

	if (mutation.kind === 'createFile') {
		const file = await createStoredFileForAction(ctx, {
			owner: args.owner,
			action: args.action,
			parent: mutation.parent,
			name: mutation.name,
			contentType: mutation.body.contentType,
			hash: mutation.body.hash,
			size: mutation.body.size,
			storageKey: mutation.body.storageKey,
		});

		return {
			revision: file.currentRevision,
			path: await importPath(ctx, file._id),
		};
	}

	if (mutation.kind === 'createText') {
		const file = await createTextFileForAction(ctx, {
			owner: args.owner,
			action: args.action,
			parent: mutation.parent,
			name: mutation.name,
			content: mutation.body.content,
			contentType: mutation.body.contentType,
			hash: mutation.body.hash,
			size: mutation.body.size,
			storageKey: mutation.body.storageKey,
		});

		return {
			revision: file.currentRevision,
			path: await importPath(ctx, file._id),
		};
	}

	if (mutation.kind === 'createTextAtPath') {
		const created = await createTextFileAtPathForAction(ctx, {
			owner: args.owner,
			action: args.action,
			parent: mutation.parent,
			path: mutation.path,
			content: mutation.body.content,
			contentType: mutation.body.contentType,
			hash: mutation.body.hash,
			size: mutation.body.size,
			storageKey: mutation.body.storageKey,
		});

		return {
			revisions: created.revisions,
			path: await importPath(ctx, created.file._id),
		};
	}

	if (mutation.kind === 'writeText') {
		const revision = await writeTextFileForAction(ctx, {
			owner: args.owner,
			action: args.action,
			file: mutation.file,
			beforeContent: mutation.beforeContent,
			content: mutation.body.content,
			contentType: mutation.body.contentType,
			hash: mutation.body.hash,
			size: mutation.body.size,
			storageKey: mutation.body.storageKey,
			expectedRevision: mutation.expectedRevision,
		});

		return {
			revision,
			path: await importPath(ctx, mutation.file),
		};
	}

	if (mutation.kind === 'move') {
		const revision = await moveFileForAction(ctx, {
			owner: args.owner,
			action: args.action,
			file: mutation.file,
			parent: mutation.parent,
			name: mutation.name,
		});

		return {
			revision,
			path: await importPath(ctx, mutation.file),
		};
	}

	if (mutation.kind === 'tag') {
		const revision = await tagFileForAction(ctx, {
			owner: args.owner,
			action: args.action,
			file: mutation.file,
			key: mutation.key,
			value: mutation.value,
		});

		return {
			revision,
			path: await importPath(ctx, mutation.file),
		};
	}

	const revision = await untagFileForAction(ctx, {
		owner: args.owner,
		action: args.action,
		file: mutation.file,
		key: mutation.key,
	});

	return {
		revision,
		path: await importPath(ctx, mutation.file),
	};
}

export async function applyTriggerMutation(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		root: Id<'files'>;
		action: Id<'actions'>;
		mutation: TriggerMutation;
	},
) {
	//
	const mutation = triggerMutationSchema.parse(args.mutation);

	return await disableTriggerForAction(ctx, {
		owner: args.owner,
		trigger: mutation.trigger,
	});
}

export async function applyCompileMutation(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		root: Id<'files'>;
		action: Id<'actions'>;
		mutation: CompileMutation;
	},
) {
	//
	const mutation = compileMutationSchema.parse(args.mutation);

	await replaceCompiledSkillsForRoot(ctx, {
		owner: args.owner,
		root: args.root,
		action: args.action,
		skills: mutation.skills,
	});
	await replaceCompiledPagesForRoot(ctx, {
		owner: args.owner,
		root: args.root,
		action: args.action,
		pages: mutation.pages,
	});
	await replaceCompiledMutationTriggersForRoot(ctx, {
		owner: args.owner,
		root: args.root,
		action: args.action,
		triggers: mutation.triggers,
	});

	return mutation.diagnostics;
}

async function importPath(ctx: MutationCtx, file: Id<'files'>) {
	//
	return await buildPath(ctx, { file });
}

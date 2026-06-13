import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { textContentType } from './fileConstants.private';
import { ensureOwnedDirectory } from './ownership.private';
import { now } from './time.private';

const hotCacheMaxBytes = 256 * 1024;

export const hashText = (content: string) => {
	let hash = 2166136261;
	for (let index = 0; index < content.length; index += 1) {
		hash ^= content.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return (hash >>> 0).toString(16).padStart(8, '0');
};

export const byteSize = (content: string) => new TextEncoder().encode(content).length;

export const readRevisionContent = async (ctx: QueryCtx | MutationCtx, revision?: Id<'file_revisions'>) => {
	if (!revision) return undefined;
	const doc = await ctx.db.get(revision);
	return doc?.content;
};

const reversiblePatch = ({
	beforeContent,
	afterContent,
	beforePath,
	afterPath,
	beforeMetadata,
	afterMetadata,
}: {
	beforeContent?: string;
	afterContent?: string;
	beforePath?: string;
	afterPath?: string;
	beforeMetadata?: Record<string, string>;
	afterMetadata?: Record<string, string>;
}) =>
	JSON.stringify({
		beforeContent,
		afterContent,
		beforePath,
		afterPath,
		beforeMetadata,
		afterMetadata,
	});

export const insertRevision = async (
	ctx: MutationCtx,
	{
		owner,
		file,
		directory,
		action,
		content,
		storageKey,
		patchStorageKey,
		patch,
		previousRevision,
		beforePath,
		afterPath,
		beforeContent,
		beforeMetadata,
		afterMetadata,
		changeKind,
		patchKind,
		contentType,
	}: {
		owner: Id<'users'>;
		file: Id<'files'>;
		directory: Id<'files'>;
		action: Id<'actions'>;
		content?: string;
		storageKey?: string;
		patchStorageKey?: string;
		patch?: string;
		previousRevision?: Id<'file_revisions'>;
		beforePath?: string;
		afterPath?: string;
		beforeContent?: string;
		beforeMetadata?: Record<string, string>;
		afterMetadata?: Record<string, string>;
		changeKind: 'created' | 'updated' | 'deleted' | 'renamed' | 'metadata' | 'tagged';
		patchKind: 'text' | 'binary' | 'full' | 'metadata';
		contentType?: string;
	},
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });
	const safeContent = content ?? '';
	const hash = hashText(safeContent);
	const size = byteSize(safeContent);
	const resolvedContentType = contentType ?? textContentType;
	const previousDoc = previousRevision ? await ctx.db.get(previousRevision) : null;
	const beforeHash = previousDoc?.hash ?? (beforeContent === undefined ? undefined : hashText(beforeContent));
	const beforeSize = previousDoc?.size ?? (beforeContent === undefined ? undefined : byteSize(beforeContent));
	const fullPatch =
		patch ??
		reversiblePatch({
			beforeContent,
			afterContent: content,
			beforePath,
			afterPath,
			beforeMetadata,
			afterMetadata,
		});
	const revision = await ctx.db.insert('file_revisions', {
		owner,
		file,
		directory,
		action,
		previousRevision,
		content: byteSize(safeContent) <= hotCacheMaxBytes ? safeContent : undefined,
		storageKey,
		patchStorageKey,
		patch: byteSize(fullPatch) <= hotCacheMaxBytes ? fullPatch : undefined,
		beforePath,
		afterPath,
		changeKind,
		patchKind,
		contentType: resolvedContentType,
		hash,
		size,
		beforeHash,
		afterHash: hash,
		beforeSize,
		afterSize: size,
		createdAt: now(),
	});

	const patchFile: Partial<Doc<'files'>> = {
		currentRevision: revision,
		contentType: resolvedContentType,
		hash,
		size,
		updatedAt: now(),
	};
	await ctx.db.patch(file, patchFile);

	return revision;
};

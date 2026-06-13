'use node';

import type { Id } from '../_generated/dataModel';
import type { TreeEntry } from './scan.private';
import { createReadUrl, readBody } from './storage.private';

type ManifestEntry = {
	path: string;
	kind: 'file' | 'folder';
	fileId: Id<'files'>;
	revisionId?: Id<'file_revisions'>;
	hash?: string;
	size?: number;
	contentType?: string;
	readUrl?: string;
	inlineContent?: string;
};

export const buildManifest = async ({ entries }: { entries: TreeEntry[] }) => {
	const manifestEntries: ManifestEntry[] = [];

	for (const entry of entries) {
		const manifestEntry: ManifestEntry = {
			path: entry.relativePath,
			kind: entry.file.kind,
			fileId: entry.file._id,
			revisionId: entry.file.currentRevision,
			hash: entry.file.hash,
			size: entry.file.size,
			contentType: entry.file.contentType,
		};

		if (entry.file.kind === 'file') {
			if (entry.storageKey) {
				manifestEntry.readUrl = await createReadUrl({ storageKey: entry.storageKey });
			} else {
				manifestEntry.inlineContent = entry.content ?? '';
			}
		}

		manifestEntries.push(manifestEntry);
	}

	return {
		version: 1,
		entries: manifestEntries,
	};
};

export const readEntryContent = async (entry?: TreeEntry) => {
	if (!entry || entry.file.kind !== 'file') return undefined;
	if (entry.content !== undefined) return entry.content;
	return (await readBody({ storageKey: entry.storageKey })) ?? '';
};

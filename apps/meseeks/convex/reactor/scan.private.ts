import { z } from 'zod/v3';
import type { Id } from '../_generated/dataModel';

export type TreeEntry = {
	file: {
		_id: Id<'files'>;
		kind: 'file' | 'folder';
		currentRevision?: Id<'file_revisions'>;
		hash?: string;
		size?: number;
		contentType?: string;
	};
	relativePath: string;
	content?: string;
	storageKey?: string;
};

const schema = z.object({
	files: z.array(
		z.object({
			path: z.string().min(1),
			content: z.string(),
			contentType: z.string().optional(),
		}),
	),
	deletedPaths: z.array(z.string()).default([]),
});

export type ScanResult = z.infer<typeof schema>;
export type ScannedFile = ScanResult['files'][number];

export const parse = (result: string) => schema.parse(JSON.parse(result));

export const buildEntryMap = (entries: TreeEntry[]) => {
	const map = new Map<string, TreeEntry>();
	for (const entry of entries) {
		if (entry.file.kind === 'file') map.set(entry.relativePath, entry);
	}
	return map;
};

'use node';

import type { Id } from '../_generated/dataModel';
import { tryThreeWayMerge } from './merge.private';
import type { ScanResult, TreeEntry } from './scan.private';
import { readEntryContent } from './vfsManifest.private';

export type FileProposal = {
	path: string;
	content: string;
	contentType?: string;
	expectedRevision?: Id<'file_revisions'>;
	beforeContent?: string;
};

export type DeleteProposal = {
	path: string;
	expectedRevision?: Id<'file_revisions'>;
	beforeContent?: string;
};

const changedFilesFromScan = async ({
	scan,
	originalFiles,
}: {
	scan: ScanResult;
	originalFiles: Map<string, TreeEntry>;
}) => {
	const changed = [];
	for (const file of scan.files) {
		const baseContent = await readEntryContent(originalFiles.get(file.path));
		if ((baseContent ?? '') !== file.content) changed.push(file);
	}

	return changed;
};

export const buildProposals = async ({
	scan,
	originalFiles,
	currentFiles,
}: {
	scan: ScanResult;
	originalFiles: Map<string, TreeEntry>;
	currentFiles: Map<string, TreeEntry>;
}) => {
	const changedFiles = await changedFilesFromScan({ scan, originalFiles });
	const files: FileProposal[] = [];
	const deletes: DeleteProposal[] = [];
	const conflicts: string[] = [];

	for (const file of changedFiles) {
		const base = originalFiles.get(file.path);
		const current = currentFiles.get(file.path);
		const baseContent = await readEntryContent(base);
		const currentContent = await readEntryContent(current);
		if (!base) {
			if (current) {
				conflicts.push(`${file.path} was created by another action while execute() was running.`);
				continue;
			}
			files.push({
				path: file.path,
				content: file.content,
				contentType: file.contentType,
			});
			continue;
		}

		if (!current) {
			conflicts.push(`${file.path} was deleted by another action while execute() was running.`);
			continue;
		}

		if (current.file.currentRevision === base.file.currentRevision) {
			files.push({
				path: file.path,
				content: file.content,
				contentType: file.contentType,
				expectedRevision: base.file.currentRevision,
				beforeContent: baseContent ?? '',
			});
			continue;
		}

		const merged = tryThreeWayMerge({
			base: baseContent ?? '',
			current: currentContent ?? '',
			proposed: file.content,
		});
		if (merged.conflict || merged.content === undefined) {
			conflicts.push(`${file.path} changed concurrently and could not be merged cleanly.`);
			continue;
		}
		files.push({
			path: file.path,
			content: merged.content,
			contentType: file.contentType,
			expectedRevision: current.file.currentRevision,
			beforeContent: currentContent ?? '',
		});
	}

	for (const path of scan.deletedPaths) {
		const base = originalFiles.get(path);
		const current = currentFiles.get(path);
		if (!base) continue;
		if (!current) continue;
		if (current.file.currentRevision !== base.file.currentRevision) {
			conflicts.push(`${path} changed concurrently and was not deleted.`);
			continue;
		}
		deletes.push({
			path,
			expectedRevision: base.file.currentRevision,
			beforeContent: (await readEntryContent(base)) ?? '',
		});
	}

	return {
		files,
		deletes,
		conflicts,
	};
};

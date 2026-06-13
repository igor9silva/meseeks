import type { Doc } from 'convex/_generated/dataModel';

export const shortId = (id?: string) => (id ? id.slice(-6) : 'none');

export const formatTime = (timestamp?: number) => {
	if (!timestamp) return 'not yet';
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(timestamp));
};

export const buildPatch = ({ path, before, after }: { path: string; before?: string; after?: string }) => {
	const oldLines = (before ?? '').split('\n');
	const newLines = (after ?? '').split('\n');
	const oldCount = Math.max(1, oldLines.length);
	const newCount = Math.max(1, newLines.length);
	const removed = oldLines.map((line) => `-${line}`).join('\n');
	const added = newLines.map((line) => `+${line}`).join('\n');
	return [
		`diff --git a${path} b${path}`,
		`--- a${path}`,
		`+++ b${path}`,
		`@@ -1,${oldCount} +1,${newCount} @@`,
		removed,
		added,
	].join('\n');
};

export function authorLabel(author: Doc<'actions'>['author']) {
	//
	if (author.kind === 'user') return 'user';
	return `action ${shortId(author.action)}`;
}

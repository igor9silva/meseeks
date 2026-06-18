import type { Doc } from 'convex/_generated/dataModel';

export type Crumb = {
	label: string;
	path: string;
};

export function normalizePath(path: string) {
	//
	return path
		.split('/')
		.map((segment) => segment.trim())
		.filter(Boolean)
		.join('/');
}

export function absolutePath(path: string) {
	//
	const normalized = normalizePath(path);
	if (!normalized) return '/';

	return `/${normalized}`;
}

export function joinPath(parent: string, name: string) {
	//
	return normalizePath([parent, name].filter(Boolean).join('/'));
}

export function dirname(path: string) {
	//
	const segments = normalizePath(path).split('/').filter(Boolean);
	segments.pop();

	return segments.join('/');
}

export function pathSegments(path: string) {
	//
	return normalizePath(path).split('/').filter(Boolean);
}

export function breadcrumbsForPath(path: string): Array<Crumb> {
	//
	const crumbs: Array<Crumb> = [{ label: '/', path: '' }];
	const segments = pathSegments(path);
	const parts: Array<string> = [];

	for (const segment of segments) {
		parts.push(segment);
		crumbs.push({
			label: segment,
			path: parts.join('/'),
		});
	}

	return crumbs;
}

export function sortEntries(entries: Array<Doc<'files'>>) {
	//
	return entries.slice().sort((left, right) => {
		if (left.name === '.pro' && right.name !== '.pro') return -1;
		if (right.name === '.pro' && left.name !== '.pro') return 1;
		if (left.kind !== right.kind) return left.kind === 'directory' ? -1 : 1;

		return left.name.localeCompare(right.name);
	});
}

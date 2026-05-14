export const TASK_FILENAME_MAX_LENGTH = 72;

export function stripKnownTaskFileExtension(value: string): string {
	//
	return value.trim().replace(/\.(?:mdx|md|txt)$/i, '');
}

export function normalizeTaskFilenameSlug(value: string): string {
	//
	const slug = stripKnownTaskFileExtension(value)
		.toLowerCase()
		.replace(/'/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');

	if (slug.length === 0) return '';

	return truncateTaskFilenameSlug(slug);
}

export function normalizeTaskRenameFilenameSlug(value: string): string {
	//
	const withoutKnownExtension = stripKnownTaskFileExtension(value);

	if (withoutKnownExtension.trim() === '_index') return '_index';
	return normalizeTaskFilenameSlug(value);
}

export function getTaskFileBasename(relativePath: string): string {
	//
	const filename = getTaskFilename(relativePath);

	return stripKnownTaskFileExtension(filename);
}

export function getTaskFilename(relativePath: string): string {
	//
	const pathSegments = relativePath.split('/');

	return pathSegments[pathSegments.length - 1] ?? relativePath;
}

export function getTaskDisplayFilename(relativePath: string): string {
	//
	const pathSegments = relativePath.split('/').filter((segment) => segment.length > 0);
	const filename = pathSegments[pathSegments.length - 1] ?? relativePath;

	if (/^_index\.(?:mdx|md|txt)$/i.test(filename)) {
		return pathSegments[pathSegments.length - 2] ?? filename;
	}

	return filename;
}

function truncateTaskFilenameSlug(slug: string): string {
	//
	if (slug.length <= TASK_FILENAME_MAX_LENGTH) return slug;

	const truncatedSlug = slug.slice(0, TASK_FILENAME_MAX_LENGTH).replace(/-+$/g, '');
	const lastDashIndex = truncatedSlug.lastIndexOf('-');
	const minimumWordBoundaryIndex = Math.floor(TASK_FILENAME_MAX_LENGTH * 0.6);

	if (lastDashIndex >= minimumWordBoundaryIndex) {
		const wordBoundarySlug = truncatedSlug.slice(0, lastDashIndex).replace(/-+$/g, '');
		if (wordBoundarySlug.length > 0) return wordBoundarySlug;
	}

	return truncatedSlug.length > 0 ? truncatedSlug : slug.slice(0, TASK_FILENAME_MAX_LENGTH);
}

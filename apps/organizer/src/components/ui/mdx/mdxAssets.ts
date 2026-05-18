export function resolveTaskAssetUrl(
	value: string | undefined,
	assetBasePath: string | null | undefined,
): string | undefined {
	//
	if (typeof value !== 'string') return undefined;
	if (!assetBasePath) return value;
	if (!isRelativeUrl(value)) return value;

	return toViteFileUrl(joinFilePath(assetBasePath, value));
}

export function rewriteRawMdxAssetUrls(text: string, assetBasePath: string | null | undefined): string {
	//
	if (!assetBasePath) return text;

	const lines = text.split('\n');
	let isInCodeBlock = false;

	return lines
		.map((line) => {
			const trimmed = line.trimStart();
			if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
				isInCodeBlock = !isInCodeBlock;
				return line;
			}

			if (isInCodeBlock) return line;

			return line.replace(/<(a|audio|img|source|video)\b[^>]*>/gi, (tag) =>
				rewriteRawMdxAssetTag(tag, assetBasePath),
			);
		})
		.join('\n');
}

function isRelativeUrl(value: string): boolean {
	//
	const trimmed = value.trim();
	if (trimmed.length === 0) return false;
	if (trimmed.startsWith('#')) return false;
	if (trimmed.startsWith('/')) return false;
	if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) return false;
	return true;
}

function joinFilePath(basePath: string, relativePath: string): string {
	//
	const parts = `${basePath}/${relativePath}`.split('/');
	const nextParts: string[] = [];

	for (const part of parts) {
		if (part.length === 0 && nextParts.length === 0) {
			nextParts.push('');
			continue;
		}

		if (part.length === 0 || part === '.') continue;

		if (part === '..') {
			if (nextParts.length > 1) nextParts.pop();
			continue;
		}

		nextParts.push(part);
	}

	return nextParts.join('/');
}

function toViteFileUrl(filePath: string): string {
	//
	if (!filePath.startsWith('/')) return filePath;

	const encodedPath = filePath
		.split('/')
		.map((segment) => encodeURIComponent(segment).replaceAll('%40', '@'))
		.join('/');

	return `/@fs${encodedPath}`;
}

function rewriteRawMdxAssetTag(tag: string, assetBasePath: string | null | undefined): string {
	//
	return tag.replace(/\b(src|href|poster)=(["'])([^"']+)\2/g, (match, attributeName, quote, value) => {
		if (typeof value !== 'string') return match;

		const resolvedValue = resolveTaskAssetUrl(value, assetBasePath);
		if (!resolvedValue) return match;

		return `${attributeName}=${quote}${resolvedValue}${quote}`;
	});
}

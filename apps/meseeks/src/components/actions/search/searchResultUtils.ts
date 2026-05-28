export function buildSummaryText({ query, resultCount }: { query?: string; resultCount: number }) {
	//
	if (query && resultCount === 0) return `No results for ${formatQueryLabel(query)}`;
	if (query) return `Found ${resultCount} results for ${formatQueryLabel(query)}`;
	if (resultCount === 0) return 'No search results';
	return `Found ${resultCount} results`;
}

export function getActionQuery(action: { args: Record<string, unknown> }) {
	//
	const query = action.args['query'];
	return typeof query === 'string' ? query : undefined;
}

export function formatQueryLabel(query: string) {
	//
	return query.includes('"') ? query : `"${query}"`;
}

export function normalizeText(value: string | null | undefined) {
	//
	const normalized = value?.trim();
	return normalized ? normalized : undefined;
}

export function getDisplayUrl(url: string | undefined, source: string | null | undefined) {
	//
	const sourceText = normalizeText(source);
	if (!url) return sourceText ? { domain: sourceText } : undefined;

	try {
		const parsedUrl = new URL(url);
		const hostname = parsedUrl.hostname;
		const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
		const rest = [parsedUrl.pathname === '/' ? '' : parsedUrl.pathname, parsedUrl.search, parsedUrl.hash].join('');

		return {
			domain,
			rest: rest || undefined,
		};
	} catch {
		const withoutProtocol = url.replace(/^https?:\/\//, '');
		const [domain = withoutProtocol, ...restParts] = withoutProtocol.split('/');
		const rest = restParts.length > 0 ? `/${restParts.join('/')}` : undefined;

		return {
			domain: sourceText ?? domain,
			rest,
		};
	}
}

export function normalizePublishedDate(value: string | null | undefined) {
	//
	const text = normalizeText(value);
	if (!text) return {};

	const date = new Date(text);
	if (Number.isNaN(date.getTime())) return { publishedLabel: text };

	return { publishedAt: date };
}

export function formatScore(value: number | null | undefined) {
	//
	if (typeof value !== 'number') return undefined;
	if (value >= 0 && value <= 1) return `${Math.round(value * 100)}%`;
	return value.toFixed(2);
}

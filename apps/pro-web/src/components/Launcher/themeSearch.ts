import { APP_THEMES } from '~/lib/themes/catalog';

export const THEME_PICKER_SEARCH = 'theme ';

export function getThemeFilterSearch(search: string) {
	//
	const trimmedSearch = search.trim();
	if (!trimmedSearch) return '';
	if (trimmedSearch.toLowerCase() === 'theme') return '';
	if (trimmedSearch.toLowerCase().startsWith('theme ')) {
		return trimmedSearch.slice('theme'.length).trim();
	}

	return trimmedSearch;
}

export function matchesThemeSearch(theme: (typeof APP_THEMES)[number], search: string) {
	//
	const filterSearch = getThemeFilterSearch(search).toLowerCase();
	if (!filterSearch) return true;

	const searchTerms = filterSearch.split(/\s+/).filter(Boolean);
	const searchableText = [
		theme.id,
		theme.name,
		theme.description,
		theme.mode,
		`${theme.mode} theme`,
		`${theme.mode} mode`,
		'theme',
	]
		.join(' ')
		.toLowerCase();

	return searchTerms.every((term) => searchableText.includes(term));
}

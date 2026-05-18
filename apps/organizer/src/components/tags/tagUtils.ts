import type { CountRow, TagGroupReport, TagReportRow } from '~/server/taskReport';

export const taskSectionLabels = ['tasks'];
export const priorityLabels = ['none', 'low', 'medium', 'high', 'critical'];

export type SortDirection = 'asc' | 'desc';

export interface TagSort {
	key: 'tag' | 'count' | 'inbox' | 'tasks' | 'references' | 'ideas' | 'priorities';
	direction: SortDirection;
}

export function groupKey(group: TagGroupReport) {
	//
	return group.key ?? 'plain';
}

export function tagHref(tag: string) {
	//
	return `/?tags=${encodeURIComponent(tag)}&minDepth=1&maxDepth=16`;
}

export function formatTagLabel(tag: TagReportRow) {
	//
	if (tag.key === null) return tag.tag;
	return tag.value;
}

export function percent(value: number, total: number) {
	//
	if (total === 0) return 0;
	return Math.round((value / total) * 100);
}

export function formatPercent(value: number, total: number) {
	//
	return `${percent(value, total)}%`;
}

export function formatNumber(value: number) {
	//
	return new Intl.NumberFormat('en-US').format(value);
}

export function getCount(rows: CountRow[], label: string) {
	//
	return rows.find((row) => row.label === label)?.count ?? 0;
}

export function priorityClassName(priority: string) {
	//
	if (priority === 'critical') return 'bg-red-400/20 text-red-100';
	if (priority === 'high') return 'bg-orange-400/20 text-orange-100';
	if (priority === 'medium') return 'bg-yellow-400/20 text-yellow-100';
	if (priority === 'low') return 'bg-blue-400/20 text-blue-100';

	return '';
}

export function nextSort(current: TagSort, key: TagSort['key']): TagSort {
	//
	const direction = current.key === key && current.direction === 'desc' ? 'asc' : 'desc';

	return {
		key,
		direction,
	};
}

export function sortTags(tags: TagReportRow[], sort: TagSort) {
	//
	return tags
		.slice()
		.sort((left, right) =>
			compareValues(getTagSortValue(left, sort.key), getTagSortValue(right, sort.key), sort.direction),
		);
}

function getTagSortValue(tag: TagReportRow, key: TagSort['key']) {
	//
	if (key === 'tag') return tag.tag;
	if (key === 'count') return tag.count;
	if (key === 'inbox') return getCount(tag.sections, 'inbox');
	if (key === 'tasks') return sumCounts(tag.sections, taskSectionLabels);
	if (key === 'references') return getCount(tag.sections, 'references');
	if (key === 'ideas') return getCount(tag.sections, 'ideas');
	if (key === 'priorities') return priorityScore(tag.priorities);

	return '';
}

function sumCounts(rows: CountRow[], labels: string[]) {
	//
	return labels.reduce((total, label) => total + getCount(rows, label), 0);
}

function priorityScore(rows: CountRow[]) {
	//
	return rows.reduce((total, row) => total + getCount(rows, row.label) * priorityRank(row.label), 0);
}

function compareValues(left: string | number, right: string | number, direction: SortDirection) {
	//
	let result = 0;

	if (typeof left === 'number' && typeof right === 'number') {
		result = left - right;
	} else {
		result = String(left).localeCompare(String(right));
	}

	if (direction === 'desc') return result * -1;
	return result;
}

function priorityRank(priority: string) {
	//
	if (priority === 'critical') return 4;
	if (priority === 'high') return 3;
	if (priority === 'medium') return 2;
	if (priority === 'low') return 1;

	return 0;
}

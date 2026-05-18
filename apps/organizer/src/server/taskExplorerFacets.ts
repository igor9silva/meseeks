import { compareTagGroupKeys, parseTaskTag } from '~/lib/taskTags';
import type { ExplorerQuery } from '~/server/taskExplorerSchemas';
import type { TaskSummary } from '~/server/taskIndexSchemas';
import { matchesTaskFilters } from './taskExplorerSearch';

export type FacetEntry = {
	value: string;
	count: number;
};

type TagFacetEntry = {
	tag: string;
	key: string | null;
	value: string;
	count: number;
};

type TagFacetGroup = {
	key: string | null;
	entries: TagFacetEntry[];
};

export type ExplorerFacets = {
	sources: FacetEntry[];
	statuses: FacetEntry[];
	sections: FacetEntry[];
	tags: FacetEntry[];
	tagGroups: TagFacetGroup[];
};

type TagCountEntry = {
	tag: string;
	key: string | null;
	value: string;
	count: number;
};

export function buildFacets(
	tasks: TaskSummary[],
	query: ExplorerQuery,
	searchTokens: string[],
	childKeySet: Set<string> | null,
): ExplorerFacets {
	//
	const sourceCounts = new Map<string, number>();
	const statusCounts = new Map<string, number>();
	const sectionCounts = new Map<string, number>();
	const tagCounts = new Map<string, TagCountEntry>();

	for (const task of tasks) {
		countSources(task, query, searchTokens, childKeySet, sourceCounts);
		countStatusesAndSections(task, query, searchTokens, childKeySet, statusCounts, sectionCounts);
		seedVisibleTagCounts(task, query, searchTokens, childKeySet, tagCounts);
		countActiveTags(task, query, searchTokens, childKeySet, tagCounts);
	}

	return {
		sources: mapCountEntries(sourceCounts, 'alpha'),
		statuses: mapCountEntries(statusCounts, 'alpha'),
		sections: mapCountEntries(sectionCounts, 'alpha'),
		tags: mapTagCountEntries(tagCounts),
		tagGroups: buildTagFacetGroups(tagCounts),
	};
}

export function buildTagOptions(tasks: TaskSummary[]): string[] {
	//
	const tags = new Set<string>();

	for (const task of tasks) {
		for (const tag of task.tags) {
			tags.add(tag);
		}
	}

	return Array.from(tags).sort((left, right) => left.localeCompare(right));
}

function countSources(
	task: TaskSummary,
	query: ExplorerQuery,
	searchTokens: string[],
	childKeySet: Set<string> | null,
	sourceCounts: Map<string, number>,
): void {
	//
	if (
		matchesTaskFilters(task, query, searchTokens, childKeySet, {
			includeSources: false,
			includeTags: true,
			includeExcludedTags: true,
			includeSearch: true,
			includeParent: true,
		})
	) {
		sourceCounts.set(task.taskSource, (sourceCounts.get(task.taskSource) ?? 0) + 1);
	}
}

function countStatusesAndSections(
	task: TaskSummary,
	query: ExplorerQuery,
	searchTokens: string[],
	childKeySet: Set<string> | null,
	statusCounts: Map<string, number>,
	sectionCounts: Map<string, number>,
): void {
	//
	if (
		!matchesTaskFilters(task, query, searchTokens, childKeySet, {
			includeSources: true,
			includeTags: true,
			includeExcludedTags: true,
			includeSearch: true,
			includeParent: true,
		})
	) {
		return;
	}

	statusCounts.set(task.status, (statusCounts.get(task.status) ?? 0) + 1);
	sectionCounts.set(task.section, (sectionCounts.get(task.section) ?? 0) + 1);
}

function seedVisibleTagCounts(
	task: TaskSummary,
	query: ExplorerQuery,
	searchTokens: string[],
	childKeySet: Set<string> | null,
	tagCounts: Map<string, TagCountEntry>,
): void {
	//
	if (
		!matchesTaskFilters(task, query, searchTokens, childKeySet, {
			includeSources: true,
			includeTags: false,
			includeExcludedTags: false,
			includeSearch: true,
			includeParent: true,
		})
	) {
		return;
	}

	for (const tagDetail of getTaskTagDetails(task)) {
		ensureTagCount(tagCounts, tagDetail);
	}
}

function countActiveTags(
	task: TaskSummary,
	query: ExplorerQuery,
	searchTokens: string[],
	childKeySet: Set<string> | null,
	tagCounts: Map<string, TagCountEntry>,
): void {
	//
	if (
		!matchesTaskFilters(task, query, searchTokens, childKeySet, {
			includeSources: true,
			includeTags: true,
			includeExcludedTags: true,
			includeSearch: true,
			includeParent: true,
		})
	) {
		return;
	}

	for (const tagDetail of getTaskTagDetails(task)) {
		addTagCount(tagCounts, tagDetail);
	}
}

function mapCountEntries(counts: Map<string, number>, sort: 'alpha' | 'count_then_alpha'): FacetEntry[] {
	//
	const entries = Array.from(counts.entries()).map(([value, count]) => ({
		value,
		count,
	}));

	if (sort === 'alpha') {
		return entries.sort((left, right) => left.value.localeCompare(right.value));
	}

	return entries.sort((left, right) => {
		if (left.count !== right.count) return right.count - left.count;
		return left.value.localeCompare(right.value);
	});
}

function getTaskTagDetails(task: TaskSummary) {
	//
	if (task.tagDetails.length > 0) return task.tagDetails;

	return task.tags.map((tag) => parseTaskTag(tag));
}

function addTagCount(counts: Map<string, TagCountEntry>, tagDetail: TaskSummary['tagDetails'][number]): void {
	//
	const existingEntry = counts.get(tagDetail.tag);

	if (existingEntry) {
		existingEntry.count += 1;
		return;
	}

	counts.set(tagDetail.tag, {
		tag: tagDetail.tag,
		key: tagDetail.key,
		value: tagDetail.value,
		count: 1,
	});
}

function ensureTagCount(counts: Map<string, TagCountEntry>, tagDetail: TaskSummary['tagDetails'][number]): void {
	//
	if (counts.has(tagDetail.tag)) return;

	counts.set(tagDetail.tag, {
		tag: tagDetail.tag,
		key: tagDetail.key,
		value: tagDetail.value,
		count: 0,
	});
}

function mapTagCountEntries(counts: Map<string, TagCountEntry>): FacetEntry[] {
	//
	return Array.from(counts.values())
		.map((entry) => ({
			value: entry.tag,
			count: entry.count,
		}))
		.sort((left, right) => left.value.localeCompare(right.value));
}

function buildTagFacetGroups(counts: Map<string, TagCountEntry>): TagFacetGroup[] {
	//
	const groupsByKey = new Map<string, TagFacetGroup>();

	for (const entry of counts.values()) {
		const lookupKey = entry.key ?? '';
		const existingGroup = groupsByKey.get(lookupKey);
		const group = existingGroup ?? {
			key: entry.key,
			entries: [],
		};

		if (!existingGroup) {
			groupsByKey.set(lookupKey, group);
		}

		group.entries.push({
			tag: entry.tag,
			key: entry.key,
			value: entry.value,
			count: entry.count,
		});
	}

	return Array.from(groupsByKey.values())
		.sort((left, right) => compareTagGroupKeys(left.key, right.key))
		.map((group) => ({
			key: group.key,
			entries: group.entries.sort(compareTagFacetEntries),
		}));
}

function compareTagFacetEntries(left: TagFacetEntry, right: TagFacetEntry): number {
	//
	if (left.value !== right.value) return left.value.localeCompare(right.value);

	return left.tag.localeCompare(right.tag);
}

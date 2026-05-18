import { compareTagGroupKeys, parseTaskTag } from '~/lib/taskTags';
import { priorities, taskSections } from '~/server/taskReportConstants';
import { getPriority, getReportSection, mapKnownCounts, mapTaskRow } from '~/server/taskReportRows';
import type { TagGroupReport, TagReportRow, TaskReportRow, TaskReportTags } from '~/server/taskReportTypes';
import type { TaskSummary } from '~/server/taskIndexSchemas';

interface TagAccumulator {
	tag: string;
	key: string | null;
	value: string;
	count: number;
	publicCount: number;
	privateCount: number;
	rootCount: number;
	childCount: number;
	sectionCounts: Map<string, number>;
	priorityCounts: Map<string, number>;
	examples: TaskReportRow[];
}

export function buildTagReport(
	tasks: TaskSummary[],
	childKeySet: Set<string>,
	parentChildCounts: Map<string, number>,
): TaskReportTags {
	//
	const tagAccumulators = new Map<string, TagAccumulator>();
	let totalTags = 0;

	for (const task of tasks) {
		const taskRow = mapTaskRow(task, parentChildCounts);
		const tagDetails = task.tagDetails.length > 0 ? task.tagDetails : task.tags.map((tag) => parseTaskTag(tag));

		for (const tagDetail of tagDetails) {
			totalTags += 1;
			const accumulator = getTagAccumulator(tagAccumulators, tagDetail.tag, tagDetail.key, tagDetail.value);

			accumulator.count += 1;
			const section = getReportSection(task);
			accumulator.sectionCounts.set(section, (accumulator.sectionCounts.get(section) ?? 0) + 1);
			accumulator.priorityCounts.set(
				getPriority(task),
				(accumulator.priorityCounts.get(getPriority(task)) ?? 0) + 1,
			);

			if (task.taskSource === 'public') {
				accumulator.publicCount += 1;
			} else {
				accumulator.privateCount += 1;
			}

			if (childKeySet.has(task.key)) {
				accumulator.childCount += 1;
			} else {
				accumulator.rootCount += 1;
			}

			if (accumulator.examples.length < 5) {
				accumulator.examples.push(taskRow);
			}
		}
	}

	const tags = Array.from(tagAccumulators.values()).map(mapTagAccumulator);
	tags.sort(compareTags);

	return {
		totalTags,
		uniqueTags: tags.length,
		groups: buildTagGroups(tags),
		all: tags,
	};
}

function getTagAccumulator(
	tagAccumulators: Map<string, TagAccumulator>,
	tag: string,
	key: string | null,
	value: string,
): TagAccumulator {
	//
	const existing = tagAccumulators.get(tag);

	if (existing) return existing;

	const next: TagAccumulator = {
		tag,
		key,
		value,
		count: 0,
		publicCount: 0,
		privateCount: 0,
		rootCount: 0,
		childCount: 0,
		sectionCounts: new Map<string, number>(),
		priorityCounts: new Map<string, number>(),
		examples: [],
	};

	tagAccumulators.set(tag, next);
	return next;
}

function mapTagAccumulator(accumulator: TagAccumulator): TagReportRow {
	//
	return {
		tag: accumulator.tag,
		key: accumulator.key,
		value: accumulator.value,
		count: accumulator.count,
		publicCount: accumulator.publicCount,
		privateCount: accumulator.privateCount,
		rootCount: accumulator.rootCount,
		childCount: accumulator.childCount,
		sections: mapKnownCounts(accumulator.sectionCounts, taskSections),
		priorities: mapKnownCounts(accumulator.priorityCounts, priorities),
		examples: accumulator.examples,
	};
}

function buildTagGroups(tags: TagReportRow[]): TagGroupReport[] {
	//
	const groupByKey = new Map<string, TagGroupReport>();

	for (const tag of tags) {
		const lookupKey = tag.key ?? '';
		const existing = groupByKey.get(lookupKey);
		const group = existing ?? {
			key: tag.key,
			total: 0,
			uniqueTags: 0,
			tags: [],
		};

		group.total += tag.count;
		group.uniqueTags += 1;
		group.tags.push(tag);

		if (!existing) {
			groupByKey.set(lookupKey, group);
		}
	}

	return Array.from(groupByKey.values()).sort((left, right) => compareTagGroupKeys(left.key, right.key));
}

function compareTags(left: TagReportRow, right: TagReportRow): number {
	//
	const keyComparison = compareTagGroupKeys(left.key, right.key);
	if (keyComparison !== 0) return keyComparison;
	if (left.count !== right.count) return right.count - left.count;
	if (left.value !== right.value) return left.value.localeCompare(right.value);
	return left.tag.localeCompare(right.tag);
}

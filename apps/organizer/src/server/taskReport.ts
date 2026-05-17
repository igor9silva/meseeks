import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { compareTagGroupKeys, parseTaskTag } from '~/lib/taskTags';
import type { IndexHealth } from '~/server/taskIndexRepository';
import type { TaskSummary } from '~/server/taskIndexSchemas';

const priorities = ['critical', 'high', 'medium', 'low', 'none'];
const taskSections = ['root', 'inbox', 'tasks', 'references', 'ideas', 'other'];
const lifecycleStatuses = ['backlog', 'active', 'completed', 'none'];
const priorityReportSections = ['inbox', 'tasks'];

const reportInputSchema = z.object({});

export const getTaskReport = createServerFn({ method: 'GET' })
	.inputValidator((input: unknown) => reportInputSchema.parse(input))
	.handler(() => buildTaskReport());

export interface CountRow {
	label: string;
	count: number;
}

export interface SectionReportRow {
	section: string;
	publicCount: number;
	privateCount: number;
	total: number;
	rootCount: number;
	childCount: number;
	warningCount: number;
}

export interface PriorityReportRow {
	priority: string;
	total: number;
	sections: CountRow[];
}

export interface StatusReportRow {
	status: string;
	publicCount: number;
	privateCount: number;
	total: number;
	rootCount: number;
	childCount: number;
}

export interface TaskReportRow {
	key: string;
	title: string;
	source: string;
	section: string;
	priority: string;
	words: number;
	warningCount: number;
	childCount: number;
	tags: string[];
}

export interface TagReportRow {
	tag: string;
	key: string | null;
	value: string;
	count: number;
	publicCount: number;
	privateCount: number;
	rootCount: number;
	childCount: number;
	sections: CountRow[];
	priorities: CountRow[];
	examples: TaskReportRow[];
}

export interface TagGroupReport {
	key: string | null;
	total: number;
	uniqueTags: number;
	tags: TagReportRow[];
}

export interface SubtaskReport {
	parentTasks: number;
	childTasks: number;
	rootTasks: number;
	unresolvedEdges: number;
	childrenBySection: CountRow[];
	parentsBySection: CountRow[];
	topParents: TaskReportRow[];
}

export interface QualityReport {
	scopeCount: number;
	warnings: number;
	wordBands: CountRow[];
	warningsByArea: CountRow[];
	tinyTasks: TaskReportRow[];
	largeTasks: TaskReportRow[];
}

export interface TaskReport {
	health: IndexHealth;
	reportedAt: string;
	indexGeneratedAt: string | null;
	totals: {
		tasks: number;
		publicTasks: number;
		privateTasks: number;
		warnings: number;
		taggedTasks: number;
		untaggedTasks: number;
		referenceTasks: number;
		workTasks: number;
	};
	sections: SectionReportRow[];
	statuses: StatusReportRow[];
	priorities: PriorityReportRow[];
	sourceTags: CountRow[];
	activeTasks: TaskReportRow[];
	quality: QualityReport;
	subtasks: SubtaskReport;
	tags: {
		totalTags: number;
		uniqueTags: number;
		groups: TagGroupReport[];
		all: TagReportRow[];
	};
}

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

async function buildTaskReport(): Promise<TaskReport> {
	//
	const repository = await import('~/server/taskIndexRepository');
	const snapshotResult = repository.readTaskIndexSnapshot();
	const reportedAt = new Date().toISOString();

	if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
		return emptyReport(snapshotResult.health, reportedAt);
	}

	const tasks = snapshotResult.snapshot.meta.tasks;
	const graphEdges = snapshotResult.snapshot.graph.edges;
	const warningCount = snapshotResult.snapshot.meta.warnings.length;
	const childKeySet = new Set<string>();
	const parentChildCounts = new Map<string, number>();
	let unresolvedEdges = 0;

	for (const edge of graphEdges) {
		if (edge.type !== 'parent') continue;

		if (!edge.resolved || edge.to === null) {
			unresolvedEdges += 1;
			continue;
		}

		childKeySet.add(edge.from);
		parentChildCounts.set(edge.to, (parentChildCounts.get(edge.to) ?? 0) + 1);
	}

	const taskRows = tasks.map((task) => mapTaskRow(task, parentChildCounts));
	const taskRowByKey = new Map<string, TaskReportRow>();

	for (const row of taskRows) {
		taskRowByKey.set(row.key, row);
	}

	const workTasks = tasks.filter((task) => getReportSection(task) !== 'references');
	const publicTasks = tasks.filter((task) => task.taskSource === 'public').length;
	const privateTasks = tasks.length - publicTasks;
	const taggedTasks = tasks.filter((task) => task.tags.length > 0).length;

	return {
		health: snapshotResult.health,
		reportedAt,
		indexGeneratedAt: snapshotResult.snapshot.meta.generatedAt,
		totals: {
			tasks: tasks.length,
			publicTasks,
			privateTasks,
			warnings: warningCount,
			taggedTasks,
			untaggedTasks: tasks.length - taggedTasks,
			referenceTasks: tasks.length - workTasks.length,
			workTasks: workTasks.length,
		},
		sections: buildSectionRows(tasks, childKeySet),
		statuses: buildStatusRows(tasks, childKeySet),
		priorities: buildPriorityRows(tasks),
		sourceTags: buildSourceTagRows(tasks),
		activeTasks: taskRows
			.filter((task) => task.tags.includes('status:active'))
			.sort(compareTaskRows)
			.slice(0, 24),
		quality: buildQualityReport(workTasks, parentChildCounts),
		subtasks: buildSubtaskReport(tasks, taskRowByKey, childKeySet, parentChildCounts, unresolvedEdges),
		tags: buildTagReport(tasks, childKeySet, parentChildCounts),
	};
}

function emptyReport(health: IndexHealth, reportedAt: string): TaskReport {
	//
	return {
		health,
		reportedAt,
		indexGeneratedAt: null,
		totals: {
			tasks: 0,
			publicTasks: 0,
			privateTasks: 0,
			warnings: 0,
			taggedTasks: 0,
			untaggedTasks: 0,
			referenceTasks: 0,
			workTasks: 0,
		},
		sections: [],
		statuses: [],
		priorities: [],
		sourceTags: [],
		activeTasks: [],
		quality: {
			scopeCount: 0,
			warnings: 0,
			wordBands: [],
			warningsByArea: [],
			tinyTasks: [],
			largeTasks: [],
		},
		subtasks: {
			parentTasks: 0,
			childTasks: 0,
			rootTasks: 0,
			unresolvedEdges: 0,
			childrenBySection: [],
			parentsBySection: [],
			topParents: [],
		},
		tags: {
			totalTags: 0,
			uniqueTags: 0,
			groups: [],
			all: [],
		},
	};
}

function buildSectionRows(tasks: TaskSummary[], childKeySet: Set<string>): SectionReportRow[] {
	//
	const rows: SectionReportRow[] = [];

	for (const section of taskSections) {
		const sectionTasks = tasks.filter((task) => getReportSection(task) === section);
		rows.push({
			section,
			publicCount: sectionTasks.filter((task) => task.taskSource === 'public').length,
			privateCount: sectionTasks.filter((task) => task.taskSource === 'private').length,
			total: sectionTasks.length,
			rootCount: sectionTasks.filter((task) => !childKeySet.has(task.key)).length,
			childCount: sectionTasks.filter((task) => childKeySet.has(task.key)).length,
			warningCount: sectionTasks.reduce((total, task) => total + task.warnings.length, 0),
		});
	}

	return rows;
}

function buildStatusRows(tasks: TaskSummary[], childKeySet: Set<string>): StatusReportRow[] {
	//
	const actionableTasks = tasks.filter((task) => getReportSection(task) === 'tasks');
	const rows: StatusReportRow[] = [];

	for (const status of lifecycleStatuses) {
		const statusTasks = actionableTasks.filter((task) => task.status === status);
		rows.push({
			status,
			publicCount: statusTasks.filter((task) => task.taskSource === 'public').length,
			privateCount: statusTasks.filter((task) => task.taskSource === 'private').length,
			total: statusTasks.length,
			rootCount: statusTasks.filter((task) => !childKeySet.has(task.key)).length,
			childCount: statusTasks.filter((task) => childKeySet.has(task.key)).length,
		});
	}

	return rows;
}

function buildPriorityRows(tasks: TaskSummary[]): PriorityReportRow[] {
	//
	const scopedTasks = tasks.filter((task) => priorityReportSections.includes(getReportSection(task)));

	return priorities.map((priority) => {
		const priorityTasks = scopedTasks.filter((task) => getPriority(task) === priority);

		return {
			priority,
			total: priorityTasks.length,
			sections: mapKnownCounts(countBy(priorityTasks, getReportSection), priorityReportSections),
		};
	});
}

function buildSourceTagRows(tasks: TaskSummary[]): CountRow[] {
	//
	const counts = new Map<string, number>();

	for (const task of tasks) {
		for (const tag of task.tags) {
			if (!tag.startsWith('source:')) continue;
			const tagDetail = parseTaskTag(tag);
			counts.set(tagDetail.value, (counts.get(tagDetail.value) ?? 0) + 1);
		}
	}

	return mapCountRows(counts).sort(compareCountRows);
}

function buildQualityReport(tasks: TaskSummary[], parentChildCounts: Map<string, number>): QualityReport {
	//
	const warnings = tasks.reduce((total, task) => total + task.warnings.length, 0);
	const warningAreaCounts = new Map<string, number>();

	for (const task of tasks) {
		const warningCount = task.warnings.length;
		if (warningCount === 0) continue;

		const area = `${task.taskSource}/${getReportSection(task)}`;
		warningAreaCounts.set(area, (warningAreaCounts.get(area) ?? 0) + warningCount);
	}

	const taskRows = tasks.map((task) => mapTaskRow(task, parentChildCounts));

	return {
		scopeCount: tasks.length,
		warnings,
		wordBands: buildWordBands(tasks),
		warningsByArea: mapCountRows(warningAreaCounts).sort(compareCountRows),
		tinyTasks: taskRows
			.filter((task) => task.words < 30)
			.sort((left, right) => left.words - right.words || left.title.localeCompare(right.title))
			.slice(0, 16),
		largeTasks: taskRows
			.sort((left, right) => right.words - left.words || left.title.localeCompare(right.title))
			.slice(0, 16),
	};
}

function buildSubtaskReport(
	tasks: TaskSummary[],
	taskRowByKey: Map<string, TaskReportRow>,
	childKeySet: Set<string>,
	parentChildCounts: Map<string, number>,
	unresolvedEdges: number,
): SubtaskReport {
	//
	const childTasks = tasks.filter((task) => childKeySet.has(task.key));
	const parentTasks = tasks.filter((task) => parentChildCounts.has(task.key));
	const topParents = Array.from(parentChildCounts.entries())
		.map(([key]) => taskRowByKey.get(key) ?? null)
		.filter((task): task is TaskReportRow => task !== null)
		.sort((left, right) => right.childCount - left.childCount || left.title.localeCompare(right.title))
		.slice(0, 20);

	return {
		parentTasks: parentTasks.length,
		childTasks: childTasks.length,
		rootTasks: tasks.length - childTasks.length,
		unresolvedEdges,
		childrenBySection: mapKnownCounts(countBy(childTasks, getReportSection), taskSections),
		parentsBySection: mapKnownCounts(countBy(parentTasks, getReportSection), taskSections),
		topParents,
	};
}

function buildTagReport(
	tasks: TaskSummary[],
	childKeySet: Set<string>,
	parentChildCounts: Map<string, number>,
): TaskReport['tags'] {
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

function buildWordBands(tasks: TaskSummary[]): CountRow[] {
	//
	const bands = new Map<string, number>([
		['empty', 0],
		['1-24 words', 0],
		['25-99 words', 0],
		['100-499 words', 0],
		['500-1999 words', 0],
		['2000+ words', 0],
	]);

	for (const task of tasks) {
		const words = getWordCount(task);

		if (words === 0) {
			incrementCount(bands, 'empty');
		} else if (words < 25) {
			incrementCount(bands, '1-24 words');
		} else if (words < 100) {
			incrementCount(bands, '25-99 words');
		} else if (words < 500) {
			incrementCount(bands, '100-499 words');
		} else if (words < 2000) {
			incrementCount(bands, '500-1999 words');
		} else {
			incrementCount(bands, '2000+ words');
		}
	}

	return mapCountRows(bands);
}

function mapTaskRow(task: TaskSummary, parentChildCounts: Map<string, number>): TaskReportRow {
	//
	return {
		key: task.key,
		title: task.title,
		source: task.taskSource,
		section: getReportSection(task),
		priority: getPriority(task),
		words: getWordCount(task),
		warningCount: task.warnings.length,
		childCount: parentChildCounts.get(task.key) ?? 0,
		tags: task.tags,
	};
}

function getReportSection(task: TaskSummary): string {
	//
	return task.section;
}

function getPriority(task: TaskSummary): string {
	//
	return task.priority ?? 'none';
}

function getWordCount(task: TaskSummary): number {
	//
	const wordCount = task.bodyWordCount;
	if (typeof wordCount === 'number') return wordCount;
	return countWords(task.bodySearch);
}

function countWords(value: string): number {
	//
	const tokens = value
		.trim()
		.split(/\s+/)
		.filter((token) => token.length > 0);
	return tokens.length;
}

function countBy(tasks: TaskSummary[], getKey: (task: TaskSummary) => string): Map<string, number> {
	//
	const counts = new Map<string, number>();

	for (const task of tasks) {
		incrementCount(counts, getKey(task));
	}

	return counts;
}

function incrementCount(counts: Map<string, number>, key: string): void {
	//
	counts.set(key, (counts.get(key) ?? 0) + 1);
}

function mapKnownCounts(counts: Map<string, number>, knownLabels: string[]): CountRow[] {
	//
	const rows: CountRow[] = [];

	for (const label of knownLabels) {
		rows.push({ label, count: counts.get(label) ?? 0 });
	}

	for (const [label, count] of counts.entries()) {
		if (knownLabels.includes(label)) continue;
		rows.push({ label, count });
	}

	return rows;
}

function mapCountRows(counts: Map<string, number>): CountRow[] {
	//
	return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
}

function compareTaskRows(left: TaskReportRow, right: TaskReportRow): number {
	//
	const leftPriority = priorities.indexOf(left.priority);
	const rightPriority = priorities.indexOf(right.priority);
	const normalizedLeftPriority = leftPriority === -1 ? priorities.length : leftPriority;
	const normalizedRightPriority = rightPriority === -1 ? priorities.length : rightPriority;

	if (normalizedLeftPriority !== normalizedRightPriority) return normalizedLeftPriority - normalizedRightPriority;
	return left.title.localeCompare(right.title);
}

function compareCountRows(left: CountRow, right: CountRow): number {
	//
	if (left.count !== right.count) return right.count - left.count;
	return left.label.localeCompare(right.label);
}

function compareTags(left: TagReportRow, right: TagReportRow): number {
	//
	const keyComparison = compareTagGroupKeys(left.key, right.key);
	if (keyComparison !== 0) return keyComparison;
	if (left.count !== right.count) return right.count - left.count;
	if (left.value !== right.value) return left.value.localeCompare(right.value);
	return left.tag.localeCompare(right.tag);
}

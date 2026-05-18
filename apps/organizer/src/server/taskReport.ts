import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { buildQualityReport } from '~/server/taskReportQuality';
import { compareTaskRows, getReportSection, mapTaskRow } from '~/server/taskReportRows';
import { buildPriorityRows, buildSectionRows, buildSourceTagRows, buildStatusRows } from '~/server/taskReportSections';
import { buildSubtaskReport } from '~/server/taskReportSubtasks';
import { buildTagReport } from '~/server/taskReportTags';
import type { TaskReport, TaskReportRow } from '~/server/taskReportTypes';
import type { IndexHealth, SnapshotResult } from '~/server/taskIndexRepository';

export type {
	CountRow,
	PriorityReportRow,
	QualityReport,
	SectionReportRow,
	StatusReportRow,
	SubtaskReport,
	TagGroupReport,
	TagReportRow,
	TaskReport,
	TaskReportRow,
	TaskReportTags,
} from '~/server/taskReportTypes';

const reportInputSchema = z.object({});

export const getTaskReport = createServerFn({ method: 'GET' })
	.inputValidator((input: unknown) => reportInputSchema.parse(input))
	.handler(() => buildTaskReport());

async function buildTaskReport(): Promise<TaskReport> {
	//
	const repository = await import('~/server/taskIndexRepository');
	const snapshotResult = repository.readTaskIndexSnapshot();
	const reportedAt = new Date().toISOString();

	if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
		return emptyReport(snapshotResult.health, reportedAt);
	}

	const tasks = snapshotResult.snapshot.meta.tasks;
	const graphSummary = buildGraphSummary(snapshotResult.snapshot.graph.edges);
	const taskRows = tasks.map((task) => mapTaskRow(task, graphSummary.parentChildCounts));
	const taskRowByKey = createTaskRowLookup(taskRows);
	const workTasks = tasks.filter((task) => getReportSection(task) !== 'references');
	const publicTasks = tasks.filter((task) => task.taskSource === 'public').length;
	const taggedTasks = tasks.filter((task) => task.tags.length > 0).length;

	return {
		health: snapshotResult.health,
		reportedAt,
		indexGeneratedAt: snapshotResult.snapshot.meta.generatedAt,
		totals: {
			tasks: tasks.length,
			publicTasks,
			privateTasks: tasks.length - publicTasks,
			warnings: snapshotResult.snapshot.meta.warnings.length,
			taggedTasks,
			untaggedTasks: tasks.length - taggedTasks,
			referenceTasks: tasks.length - workTasks.length,
			workTasks: workTasks.length,
		},
		sections: buildSectionRows(tasks, graphSummary.childKeySet),
		statuses: buildStatusRows(tasks, graphSummary.childKeySet),
		priorities: buildPriorityRows(tasks),
		sourceTags: buildSourceTagRows(tasks),
		activeTasks: taskRows
			.filter((task) => task.tags.includes('status:active'))
			.sort(compareTaskRows)
			.slice(0, 24),
		quality: buildQualityReport(workTasks, graphSummary.parentChildCounts),
		subtasks: buildSubtaskReport(
			tasks,
			taskRowByKey,
			graphSummary.childKeySet,
			graphSummary.parentChildCounts,
			graphSummary.unresolvedEdges,
		),
		tags: buildTagReport(tasks, graphSummary.childKeySet, graphSummary.parentChildCounts),
	};
}

function buildGraphSummary(graphEdges: NonNullable<SnapshotResult['snapshot']>['graph']['edges']) {
	//
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

	return {
		childKeySet,
		parentChildCounts,
		unresolvedEdges,
	};
}

function createTaskRowLookup(taskRows: TaskReportRow[]): Map<string, TaskReportRow> {
	//
	const taskRowByKey = new Map<string, TaskReportRow>();

	for (const row of taskRows) {
		taskRowByKey.set(row.key, row);
	}

	return taskRowByKey;
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

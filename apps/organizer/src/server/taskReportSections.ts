import { parseTaskTag } from '~/lib/taskTags';
import { lifecycleStatuses, priorities, priorityReportSections, taskSections } from '~/server/taskReportConstants';
import {
	compareCountRows,
	countBy,
	getPriority,
	getReportSection,
	mapCountRows,
	mapKnownCounts,
} from '~/server/taskReportRows';
import type { CountRow, PriorityReportRow, SectionReportRow, StatusReportRow } from '~/server/taskReportTypes';
import type { TaskSummary } from '~/server/taskIndexSchemas';

export function buildSectionRows(tasks: TaskSummary[], childKeySet: Set<string>): SectionReportRow[] {
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

export function buildStatusRows(tasks: TaskSummary[], childKeySet: Set<string>): StatusReportRow[] {
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

export function buildPriorityRows(tasks: TaskSummary[]): PriorityReportRow[] {
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

export function buildSourceTagRows(tasks: TaskSummary[]): CountRow[] {
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

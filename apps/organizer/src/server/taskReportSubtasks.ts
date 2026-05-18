import { taskSections } from '~/server/taskReportConstants';
import { countBy, getReportSection, mapKnownCounts } from '~/server/taskReportRows';
import type { SubtaskReport, TaskReportRow } from '~/server/taskReportTypes';
import type { TaskSummary } from '~/server/taskIndexSchemas';

export function buildSubtaskReport(
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

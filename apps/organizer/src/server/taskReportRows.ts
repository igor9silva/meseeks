import { priorities } from '~/server/taskReportConstants';
import type { CountRow, TaskReportRow } from '~/server/taskReportTypes';
import type { TaskSummary } from '~/server/taskIndexSchemas';

export function mapTaskRow(task: TaskSummary, parentChildCounts: Map<string, number>): TaskReportRow {
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

export function getReportSection(task: TaskSummary): string {
	//
	return task.section;
}

export function getPriority(task: TaskSummary): string {
	//
	return task.priority ?? 'none';
}

export function getWordCount(task: TaskSummary): number {
	//
	const wordCount = task.bodyWordCount;
	if (typeof wordCount === 'number') return wordCount;
	return countWords(task.bodySearch);
}

export function countBy(tasks: TaskSummary[], getKey: (task: TaskSummary) => string): Map<string, number> {
	//
	const counts = new Map<string, number>();

	for (const task of tasks) {
		incrementCount(counts, getKey(task));
	}

	return counts;
}

export function incrementCount(counts: Map<string, number>, key: string): void {
	//
	counts.set(key, (counts.get(key) ?? 0) + 1);
}

export function mapKnownCounts(counts: Map<string, number>, knownLabels: string[]): CountRow[] {
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

export function mapCountRows(counts: Map<string, number>): CountRow[] {
	//
	return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
}

export function compareTaskRows(left: TaskReportRow, right: TaskReportRow): number {
	//
	const leftPriority = priorities.indexOf(left.priority);
	const rightPriority = priorities.indexOf(right.priority);
	const normalizedLeftPriority = leftPriority === -1 ? priorities.length : leftPriority;
	const normalizedRightPriority = rightPriority === -1 ? priorities.length : rightPriority;

	if (normalizedLeftPriority !== normalizedRightPriority) return normalizedLeftPriority - normalizedRightPriority;
	return left.title.localeCompare(right.title);
}

export function compareCountRows(left: CountRow, right: CountRow): number {
	//
	if (left.count !== right.count) return right.count - left.count;
	return left.label.localeCompare(right.label);
}

function countWords(value: string): number {
	//
	const tokens = value
		.trim()
		.split(/\s+/)
		.filter((token) => token.length > 0);
	return tokens.length;
}

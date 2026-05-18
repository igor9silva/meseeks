import { compareCountRows, getReportSection, getWordCount, incrementCount, mapCountRows, mapTaskRow } from '~/server/taskReportRows';
import type { CountRow, QualityReport } from '~/server/taskReportTypes';
import type { TaskSummary } from '~/server/taskIndexSchemas';

export function buildQualityReport(tasks: TaskSummary[], parentChildCounts: Map<string, number>): QualityReport {
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

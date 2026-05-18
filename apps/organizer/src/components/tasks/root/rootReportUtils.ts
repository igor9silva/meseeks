import type { CountRow, TaskReport } from '~/server/taskReport';

export function getRootLifecycleRows(report: TaskReport): CountRow[] {
	//
	const inbox = report.sections.find((section) => section.section === 'inbox');

	return [
		{ label: 'Inbox', count: inbox?.total ?? 0 },
		{ label: 'Backlog', count: getRootStatusCount(report, 'backlog') },
		{ label: 'Active', count: getRootStatusCount(report, 'active') },
		{ label: 'Completed', count: getRootStatusCount(report, 'completed') },
	];
}

export function getRootSectionRows(report: TaskReport): CountRow[] {
	//
	const sections = ['inbox', 'tasks', 'references', 'ideas'];

	return sections.map((section) => ({
		label: formatRootReportLabel(section),
		count: report.sections.find((row) => row.section === section)?.total ?? 0,
	}));
}

export function getRootSectionReportRow(report: TaskReport, section: string) {
	//
	return (
		report.sections.find((row) => row.section === section) ?? {
			section,
			publicCount: 0,
			privateCount: 0,
			total: 0,
			rootCount: 0,
			childCount: 0,
			warningCount: 0,
		}
	);
}

export function rootReportPercent(value: number, total: number): number {
	//
	if (total === 0) return 0;
	return Math.round((value / total) * 100);
}

export function formatRootReportNumber(value: number): string {
	//
	return new Intl.NumberFormat('en-US').format(value);
}

export function formatRootReportLabel(label: string): string {
	//
	if (label === 'inbox') return 'Inbox';
	if (label === 'tasks') return 'Tasks';
	if (label === 'references') return 'References';
	if (label === 'ideas') return 'Ideas';
	if (label === 'critical') return 'Critical';
	if (label === 'high') return 'High';
	if (label === 'medium') return 'Medium';
	if (label === 'low') return 'Low';
	return label;
}

function getRootStatusCount(report: TaskReport, status: string): number {
	//
	return report.statuses.find((row) => row.status === status)?.total ?? 0;
}

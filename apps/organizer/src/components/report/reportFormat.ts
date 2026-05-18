import type { CountRow } from '~/server/taskReport';

export function taskHref(taskKey: string) {
	//
	const separatorIndex = taskKey.indexOf(':');
	if (separatorIndex < 0) return '/';

	const source = taskKey.slice(0, separatorIndex);
	const taskPath = taskKey.slice(separatorIndex + 1);
	const path = taskPath.length === 0 ? `/${source}` : `/${source}/${taskPath}`;

	return `${path}?detail=expanded`;
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

export function formatTaskSectionLabel(section: string) {
	//
	if (section === 'root') return 'Root';
	if (section === 'inbox') return 'Inbox';
	if (section === 'tasks') return 'Tasks';
	if (section === 'references') return 'References';
	if (section === 'ideas') return 'Ideas';
	return section;
}

export function priorityDotClassName(priority: string) {
	//
	if (priority === 'critical') return 'bg-red-500';
	if (priority === 'high') return 'bg-orange-400';
	if (priority === 'medium') return 'bg-yellow-400';
	if (priority === 'low') return 'bg-blue-400';
	return 'bg-zinc-500';
}

export function priorityClassName(priority: string) {
	//
	if (priority === 'critical') return 'bg-red-400/20 text-red-100';
	if (priority === 'high') return 'bg-orange-400/20 text-orange-100';
	if (priority === 'medium') return 'bg-yellow-400/20 text-yellow-100';
	if (priority === 'low') return 'bg-blue-400/20 text-blue-100';

	return 'bg-zinc-500/30 text-zinc-100';
}

export function getCount(rows: CountRow[], label: string) {
	//
	return rows.find((row) => row.label === label)?.count ?? 0;
}

export function priorityRank(priority: string) {
	//
	if (priority === 'critical') return 4;
	if (priority === 'high') return 3;
	if (priority === 'medium') return 2;
	if (priority === 'low') return 1;

	return 0;
}

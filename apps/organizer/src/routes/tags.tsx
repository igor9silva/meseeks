import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Lock } from 'lucide-react';
import { formatTagGroupLabel } from '~/lib/taskTags';
import { getTaskReport, type CountRow, type TagGroupReport, type TagReportRow } from '~/server/taskReport';

const taskBucketLabels = ['backlog', 'active', 'completed'];
const priorityLabels = ['none', 'low', 'medium', 'high', 'critical'];

export const Route = createFileRoute('/tags')({
	head: () => ({
		meta: [{ title: 'Tags' }],
	}),
	loader: () => getTaskReport({ data: {} }),
	component: TagsRoute,
});

function TagsRoute() {
	//
	const getTaskReportServer = useServerFn(getTaskReport);
	const initialReport = Route.useLoaderData();
	const reportQuery = useQuery({
		queryKey: ['task-report'],
		queryFn: () => getTaskReportServer({ data: {} }),
		initialData: initialReport,
		refetchInterval: 2000,
	});

	if (reportQuery.isPending) {
		return <TagsShell>Loading tags...</TagsShell>;
	}

	if (reportQuery.isError) {
		return <TagsShell>Could not load tags.</TagsShell>;
	}

	const report = reportQuery.data;

	if (!report.health.isReady) {
		return (
			<TagsShell>
				<div className="rounded border border-destructive/50 bg-destructive/10 p-4 text-sm">
					<div className="font-medium">Task indexes unavailable</div>
					<ul className="mt-2 list-disc pl-5 text-muted-foreground">
						{report.health.errors.map((error) => (
							<li key={error}>{error}</li>
						))}
					</ul>
				</div>
			</TagsShell>
		);
	}

	return (
		<TagsShell>
			<Header />
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Metric label="Tag uses" value={formatNumber(report.tags.totalTags)} detail="total assignments" />
				<Metric label="Unique tags" value={formatNumber(report.tags.uniqueTags)} detail={`${formatNumber(report.tags.groups.length)} groups`} />
				<Metric label="Tagged tasks" value={formatNumber(report.totals.taggedTasks)} detail={`${formatPercent(report.totals.taggedTasks, report.totals.tasks)} of tasks`} />
				<Metric label="Untagged tasks" value={formatNumber(report.totals.untaggedTasks)} detail={`${formatPercent(report.totals.untaggedTasks, report.totals.tasks)} of tasks`} />
			</div>

			{report.tags.groups.map((group) => (
				<section key={groupKey(group)} className="rounded border border-border bg-zinc-950/70">
					<div className="flex flex-col gap-1 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
						<h2 className="text-lg font-semibold">{formatTagGroupLabel(group.key)}</h2>
						<div className="text-sm text-muted-foreground">
							{formatNumber(group.uniqueTags)} tags · {formatNumber(group.total)} uses
						</div>
					</div>
					<div className="p-4">
						<TagTable tags={group.tags} totalTasks={report.totals.tasks} />
					</div>
				</section>
			))}
		</TagsShell>
	);
}

function Header() {
	//
	return (
		<div className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
			<div>
				<h1 className="text-4xl font-semibold tracking-normal">Tags</h1>
			</div>
			<nav className="flex flex-wrap gap-2 text-sm">
				<a href="/" className="rounded border border-border px-3 py-1.5 hover:bg-accent">
					Organizer
				</a>
				<a href="/report" className="rounded border border-border px-3 py-1.5 hover:bg-accent">
					Report
				</a>
			</nav>
		</div>
	);
}

function TagsShell({ children }: { children: ReactNode }) {
	//
	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="flex w-full max-w-none flex-col gap-6 px-6 py-6">
				{children}
			</div>
		</main>
	);
}

function TagTable({ tags, totalTasks }: { tags: TagReportRow[]; totalTasks: number }) {
	//
	const [sort, setSort] = useState<TagSort>({
		key: 'count',
		direction: 'desc',
	});
	const sortedTags = sortTags(tags, sort);

	return (
		<div className="overflow-x-auto rounded border border-border bg-card">
			<table className="w-full min-w-full border-collapse text-sm">
				<thead>
					<tr>
						<SortableTh label="Tag" sortKey="tag" sort={sort} onSort={setSort} />
						<SortableTh label="Count" sortKey="count" sort={sort} onSort={setSort} align="right" />
						<SortableTh label="Inbox" sortKey="inbox" sort={sort} onSort={setSort} align="right" />
						<SortableTh label="Tasks" sortKey="tasks" sort={sort} onSort={setSort} />
						<SortableTh label="References" sortKey="references" sort={sort} onSort={setSort} align="right" />
						<SortableTh label="Ideas" sortKey="ideas" sort={sort} onSort={setSort} align="right" />
						<SortableTh label="Priorities" sortKey="priorities" sort={sort} onSort={setSort} />
					</tr>
				</thead>
				<tbody>
					{sortedTags.map((tag) => (
						<tr key={tag.tag}>
							<Td>
								<a href={tagHref(tag.tag)} title={tag.tag} className="font-medium text-cyan-300 hover:text-cyan-200">
									{formatTagLabel(tag)}
								</a>
								<div className="mt-1 text-xs text-muted-foreground">{formatPercent(tag.count, totalTasks)} of tasks</div>
							</Td>
							<Td align="right">
								<CountWithPublic total={tag.count} publicCount={tag.publicCount} />
							</Td>
							<Td align="right">{formatNumber(getCount(tag.buckets, 'inbox'))}</Td>
							<Td>
								<InlineCounts rows={tag.buckets} labels={taskBucketLabels} />
							</Td>
							<Td align="right">{formatNumber(getCount(tag.buckets, 'references'))}</Td>
							<Td align="right">{formatNumber(getCount(tag.buckets, 'ideas'))}</Td>
							<Td>
								<InlineCounts rows={tag.priorities} labels={priorityLabels} colorPriority />
							</Td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function InlineCounts({
	rows,
	labels,
	colorPriority = false,
}: {
	rows: CountRow[];
	labels: string[];
	colorPriority?: boolean;
}) {
	//
	return (
		<div className="flex flex-wrap gap-1">
			{labels.map((label) => (
				<span
					key={label}
					className={`rounded border border-border px-1.5 py-0.5 text-xs ${colorPriority ? priorityClassName(label) : ''}`}
				>
					{label} <span className="text-muted-foreground">{getCount(rows, label)}</span>
				</span>
			))}
		</div>
	);
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
	//
	return (
		<div className="rounded border border-border bg-card p-4">
			<div className="text-sm text-muted-foreground">{label}</div>
			<div className="mt-3 text-3xl font-semibold tabular-nums">{value}</div>
			<div className="mt-1 text-sm text-muted-foreground">{detail}</div>
		</div>
	);
}

function SortableTh({
	label,
	sortKey,
	sort,
	onSort,
	align = 'left',
}: {
	label: string;
	sortKey: TagSort['key'];
	sort: TagSort;
	onSort: (sort: TagSort) => void;
	align?: 'left' | 'right';
}) {
	//
	const isActive = sort.key === sortKey;
	const indicator = isActive && sort.direction === 'asc' ? '↑' : isActive ? '↓' : '';

	return (
		<th className={`border-b border-border bg-zinc-900 px-3 py-2 font-medium text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>
			<button
				type="button"
				onClick={() => onSort(nextSort(sort, sortKey))}
				className={`inline-flex items-center gap-1 rounded text-left hover:text-foreground ${align === 'right' ? 'justify-end' : ''}`}
			>
				<span>{label}</span>
				<span className="w-3 text-xs">{indicator}</span>
			</button>
		</th>
	);
}

function Td({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
	//
	return <td className={`border-b border-border px-3 py-2 align-top last:border-b-0 ${align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}>{children}</td>;
}

function CountWithPublic({ total, publicCount }: { total: number; publicCount: number }) {
	//
	const privateCount = total - publicCount;

	return (
		<span className="inline-flex items-center justify-end gap-1 tabular-nums">
			<span>{formatNumber(publicCount)}</span>
			<span className="text-muted-foreground">/</span>
			<span>{formatNumber(privateCount)}</span>
			<Lock className="size-3 text-muted-foreground" aria-label="private" />
		</span>
	);
}

function groupKey(group: TagGroupReport) {
	//
	return group.key ?? 'plain';
}

function tagHref(tag: string) {
	//
	const statuses = 'inbox,backlog,active,ideas,references,completed';
	return `/?sources=public,private&statuses=${encodeURIComponent(statuses)}&tags=${encodeURIComponent(tag)}`;
}

function formatTagLabel(tag: TagReportRow) {
	//
	if (tag.key === null) return tag.tag;
	return tag.value;
}

function percent(value: number, total: number) {
	//
	if (total === 0) return 0;
	return Math.round((value / total) * 100);
}

function formatPercent(value: number, total: number) {
	//
	return `${percent(value, total)}%`;
}

function formatNumber(value: number) {
	//
	return value.toLocaleString();
}

function getCount(rows: CountRow[], label: string) {
	//
	return rows.find((row) => row.label === label)?.count ?? 0;
}

function priorityClassName(priority: string) {
	//
	if (priority === 'critical') return 'bg-red-400/20 text-red-100';
	if (priority === 'high') return 'bg-orange-400/20 text-orange-100';
	if (priority === 'medium') return 'bg-yellow-400/20 text-yellow-100';
	if (priority === 'low') return 'bg-blue-400/20 text-blue-100';

	return '';
}

type SortDirection = 'asc' | 'desc';

interface TagSort {
	key: 'tag' | 'count' | 'inbox' | 'tasks' | 'references' | 'ideas' | 'priorities';
	direction: SortDirection;
}

function nextSort(current: TagSort, key: TagSort['key']): TagSort {
	//
	const direction = current.key === key && current.direction === 'desc' ? 'asc' : 'desc';

	return {
		key,
		direction,
	};
}

function sortTags(tags: TagReportRow[], sort: TagSort) {
	//
	return tags.slice().sort((left, right) => compareValues(
		getTagSortValue(left, sort.key),
		getTagSortValue(right, sort.key),
		sort.direction,
	));
}

function getTagSortValue(tag: TagReportRow, key: TagSort['key']) {
	//
	if (key === 'tag') return tag.tag;
	if (key === 'count') return tag.count;
	if (key === 'inbox') return getCount(tag.buckets, 'inbox');
	if (key === 'tasks') return sumCounts(tag.buckets, taskBucketLabels);
	if (key === 'references') return getCount(tag.buckets, 'references');
	if (key === 'ideas') return getCount(tag.buckets, 'ideas');
	if (key === 'priorities') return priorityScore(tag.priorities);

	return '';
}

function sumCounts(rows: CountRow[], labels: string[]) {
	//
	return labels.reduce((total, label) => total + getCount(rows, label), 0);
}

function priorityScore(rows: CountRow[]) {
	//
	return rows.reduce((total, row) => total + getCount(rows, row.label) * priorityRank(row.label), 0);
}

function compareValues(left: string | number, right: string | number, direction: SortDirection) {
	//
	let result = 0;

	if (typeof left === 'number' && typeof right === 'number') {
		result = left - right;
	} else {
		result = String(left).localeCompare(String(right));
	}

	if (direction === 'desc') return result * -1;
	return result;
}

function priorityRank(priority: string) {
	//
	if (priority === 'critical') return 4;
	if (priority === 'high') return 3;
	if (priority === 'medium') return 2;
	if (priority === 'low') return 1;

	return 0;
}

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import {
	AlertTriangle,
	Archive,
	BarChart3,
	CircleDot,
	Database,
	FolderKanban,
	GitBranch,
	Inbox,
	Lock,
	Tags,
	Zap,
} from 'lucide-react';
import { formatTaskBucketLabel } from '~/lib/taskBuckets';
import { getTaskReport, type CountRow, type TaskReport, type TaskReportRow } from '~/server/taskReport';

export const Route = createFileRoute('/report')({
	head: () => ({
		meta: [{ title: 'Report' }],
	}),
	loader: () => getTaskReport({ data: {} }),
	component: ReportRoute,
});

function ReportRoute() {
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
		return <ReportShell title="Report">Loading report...</ReportShell>;
	}

	if (reportQuery.isError) {
		return <ReportShell title="Report">Could not load report.</ReportShell>;
	}

	const report = reportQuery.data;

	if (!report.health.isReady) {
		return (
			<ReportShell title="Report">
				<div className="rounded border border-destructive/50 bg-destructive/10 p-4 text-sm">
					<div className="font-medium">Task indexes unavailable</div>
					<ul className="mt-2 list-disc pl-5 text-muted-foreground">
						{report.health.errors.map((error) => (
							<li key={error}>{error}</li>
						))}
					</ul>
				</div>
			</ReportShell>
		);
	}

	return (
		<ReportShell title="Report">
			<HeaderMeta />
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Metric icon={<Database className="size-4" />} label="Tasks" value={formatNumber(report.totals.tasks)} detail="public + private" />
				<Metric icon={<Lock className="size-4" />} label="Private" value={formatNumber(report.totals.privateTasks)} detail={`${formatPercent(report.totals.privateTasks, report.totals.tasks)} of all tasks`} />
				<Metric icon={<Inbox className="size-4" />} label="Work tasks" value={formatNumber(report.totals.workTasks)} detail="references excluded" />
				<Metric icon={<GitBranch className="size-4" />} label="Children" value={formatNumber(report.subtasks.childTasks)} detail={`${formatNumber(report.subtasks.parentTasks)} parent tasks`} />
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<Section title="Buckets" icon={<FolderKanban className="size-5" />}>
					<BucketFlow report={report} />
				</Section>

				<Section title="Priorities" icon={<CircleDot className="size-5" />}>
					<PriorityTable report={report} />
				</Section>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
				<Section title="Sources" icon={<Archive className="size-5" />}>
					<SourceSummary report={report} />
				</Section>

				<Section title="Subtasks" icon={<GitBranch className="size-5" />}>
					<SubtaskSummary report={report} />
				</Section>
			</div>

			<Section title="Active" icon={<Zap className="size-5" />}>
				<TaskTable rows={report.activeTasks} showBucket />
			</Section>

			<Section title="Quality Signals" icon={<BarChart3 className="size-5" />}>
				<div className="grid gap-6 xl:grid-cols-3">
					<div>
						<SectionHeading title="Word counts" detail={`${formatNumber(report.quality.scopeCount)} non-reference tasks`} />
						<CountBars rows={report.quality.wordBands} total={report.quality.scopeCount} />
					</div>
					<div>
						<SectionHeading title="Warnings" detail={`${formatNumber(report.quality.warnings)} warnings outside references`} />
						<CountBars rows={report.quality.warningsByArea} total={report.quality.warnings} />
					</div>
					<div>
						<SectionHeading title="Tag coverage" detail="all tasks" />
						<CountBars
							rows={[
								{ label: 'tagged', count: report.totals.taggedTasks },
								{ label: 'untagged', count: report.totals.untaggedTasks },
							]}
							total={report.totals.tasks}
						/>
						<a href="/tags" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
							<Tags className="size-4" />
							Open tag report
						</a>
					</div>
				</div>
			</Section>

			<Section title="Outliers" icon={<AlertTriangle className="size-5" />}>
				<div className="grid gap-6 xl:grid-cols-2">
					<div>
						<SectionHeading title="Smallest non-reference tasks" detail="under 30 words" />
						<TaskTable rows={report.quality.tinyTasks} compact />
					</div>
					<div>
						<SectionHeading title="Largest non-reference tasks" detail="sorted by body word count" />
						<TaskTable rows={report.quality.largeTasks} compact />
					</div>
				</div>
			</Section>
		</ReportShell>
	);
}

function HeaderMeta() {
	//
	return (
		<div className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
			<div>
				<h1 className="text-4xl font-semibold tracking-normal">Report</h1>
			</div>
			<nav className="flex flex-wrap gap-2 text-sm">
				<a href="/" className="rounded border border-border px-3 py-1.5 hover:bg-accent">
					Organizer
				</a>
				<a href="/tags" className="rounded border border-border px-3 py-1.5 hover:bg-accent">
					Tags
				</a>
			</nav>
		</div>
	);
}

function ReportShell({ title, children }: { title: string; children: ReactNode }) {
	//
	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="flex w-full max-w-none flex-col gap-6 px-6 py-6">
				{typeof children === 'string' ? (
					<>
						<h1 className="text-4xl font-semibold tracking-normal">{title}</h1>
						<div className="text-sm text-muted-foreground">{children}</div>
					</>
				) : (
					children
				)}
			</div>
		</main>
	);
}

function BucketFlow({ report }: { report: TaskReport }) {
	//
	const lifecycleBuckets = ['inbox', 'backlog', 'active'];
	const holdingBuckets = ['ideas', 'references'];
	const bucketByName = new Map(report.buckets.map((bucket) => [bucket.bucket, bucket]));
	const maxLifecycleCount = Math.max(
		1,
		...lifecycleBuckets.map((bucket) => bucketByName.get(bucket)?.total ?? 0),
	);

	return (
		<div className="space-y-5">
			<div>
				<SectionHeading title="Lifecycle funnel" />
				<div className="grid gap-3 lg:grid-cols-3">
					{lifecycleBuckets.map((bucket, index) => {
						const row = bucketByName.get(bucket);
						if (!row) return null;

						return (
							<div key={bucket} className="relative rounded border border-border bg-card p-4">
								<div className="flex items-center justify-between gap-3">
									<div className="font-medium">{formatTaskBucketLabel(bucket)}</div>
									<div className="text-2xl font-semibold tabular-nums">{formatNumber(row.total)}</div>
								</div>
								<div className="mt-3 h-2 overflow-hidden rounded bg-zinc-800">
									<div className={bucketFillClassName(bucket)} style={{ width: `${Math.max(4, percent(row.total, maxLifecycleCount))}%` }} />
								</div>
								<div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
									<div>
										<div>public</div>
										<div className="font-medium text-foreground">{formatNumber(row.publicCount)}</div>
									</div>
									<div>
										<div>private</div>
										<div className="font-medium text-foreground">{formatNumber(row.privateCount)}</div>
									</div>
									<div>
										<div>children</div>
										<div className="font-medium text-foreground">{formatNumber(row.childCount)}</div>
									</div>
								</div>
								{index < lifecycleBuckets.length - 1 ? <div className="absolute -right-2 top-1/2 hidden text-muted-foreground lg:block">→</div> : null}
							</div>
						);
					})}
				</div>
			</div>

			<div>
				<SectionHeading title="Holding buckets" />
				<div className="grid gap-3 md:grid-cols-2">
					{holdingBuckets.map((bucket) => {
						const row = bucketByName.get(bucket);
						if (!row) return null;

						return (
							<div key={bucket} className="rounded border border-border bg-card p-4">
								<div className="flex items-center justify-between gap-3">
									<div className="font-medium">{formatTaskBucketLabel(bucket)}</div>
									<div className="text-2xl font-semibold tabular-nums">{formatNumber(row.total)}</div>
								</div>
								<div className="mt-3 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
									<div>
										<div>public</div>
										<div className="font-medium text-foreground">{formatNumber(row.publicCount)}</div>
									</div>
									<div>
										<div>private</div>
										<div className="font-medium text-foreground">{formatNumber(row.privateCount)}</div>
									</div>
									<div>
										<div>roots</div>
										<div className="font-medium text-foreground">{formatNumber(row.rootCount)}</div>
									</div>
									<div>
										<div>warnings</div>
										<div className="font-medium text-foreground">{formatNumber(row.warningCount)}</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function PriorityTable({ report }: { report: TaskReport }) {
	//
	const [sort, setSort] = useState<PrioritySort>({
		key: 'total',
		direction: 'desc',
	});
	const priorityBuckets = report.priorities[0]?.buckets ?? [];
	const rows = sortPriorityRows(report.priorities, sort);

	return (
		<Table>
			<thead>
				<tr>
					<SortableTh
						label="Priority"
						sortKey="priority"
						sort={sort}
						onSort={setSort}
					/>
					<SortableTh
						label="Total"
						sortKey="total"
						sort={sort}
						onSort={setSort}
						align="right"
					/>
					{priorityBuckets.map((row) => (
						<SortableTh
							key={row.label}
							label={formatTaskBucketLabel(row.label)}
							sortKey={`bucket:${row.label}`}
							sort={sort}
							onSort={setSort}
							align="right"
						/>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.priority}>
						<Td>
							<div className="flex items-center gap-2">
								<span className={`size-2 rounded-full ${priorityDotClassName(row.priority)}`} />
								<PriorityPill priority={row.priority} />
							</div>
						</Td>
						<Td align="right">{formatNumber(row.total)}</Td>
						{row.buckets.map((bucket) => (
							<Td key={bucket.label} align="right">
								{formatNumber(bucket.count)}
							</Td>
						))}
					</tr>
				))}
			</tbody>
		</Table>
	);
}

function SourceSummary({ report }: { report: TaskReport }) {
	//
	return (
		<div className="space-y-4">
			<div>
				<SectionHeading title="Source tags" />
				<CountBars rows={report.sourceTags} total={report.totals.tasks} />
			</div>
			<SourceChart rows={report.sourceTags} />
		</div>
	);
}

function SourceChart({ rows }: { rows: CountRow[] }) {
	//
	const total = rows.reduce((sum, row) => sum + row.count, 0);
	const colors = ['#22d3ee', '#a78bfa', '#f59e0b', '#34d399', '#f472b6'];
	let offset = 0;
	const segments = rows.map((row, index) => {
		const width = percent(row.count, total);
		const segment = `${colors[index % colors.length]} ${offset}% ${offset + width}%`;
		offset += width;
		return segment;
	});

	return (
		<div className="grid min-h-96 grid-cols-[minmax(16rem,0.8fr)_minmax(14rem,1fr)] items-center gap-8 rounded border border-border bg-card p-6">
			<div
				className="mx-auto grid aspect-square w-full max-w-96 place-items-center rounded-full"
				style={{ background: `conic-gradient(${segments.join(', ')})` }}
			>
				<div className="grid size-36 place-items-center rounded-full bg-card text-2xl font-semibold tabular-nums">
					{formatNumber(total)}
				</div>
			</div>
			<div className="min-w-0 space-y-3">
				{rows.map((row, index) => (
					<div key={row.label} className="grid grid-cols-[1rem_minmax(0,1fr)_4rem_5rem] items-center gap-2 text-sm">
						<span className="size-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
						<span className="truncate">{row.label}</span>
						<span className="text-right tabular-nums text-foreground">{formatPercent(row.count, total)}</span>
						<span className="text-right tabular-nums text-muted-foreground">{formatNumber(row.count)}</span>
					</div>
				))}
			</div>
		</div>
	);
}

function SubtaskSummary({ report }: { report: TaskReport }) {
	//
	return (
		<div className="space-y-4">
			<div className="grid gap-3 md:grid-cols-4">
				<Metric label="Parents" value={formatNumber(report.subtasks.parentTasks)} detail="tasks with children" />
				<Metric label="Children" value={formatNumber(report.subtasks.childTasks)} detail="resolved child edges" />
				<Metric label="Roots" value={formatNumber(report.subtasks.rootTasks)} detail="not a child task" />
				<Metric label="Unresolved" value={formatNumber(report.subtasks.unresolvedEdges)} detail="parent edges" />
			</div>
			<div className="grid gap-4 xl:grid-cols-2">
				<div>
					<SectionHeading title="Children by bucket" />
					<CountBars rows={report.subtasks.childrenByBucket} total={report.subtasks.childTasks} />
				</div>
				<div>
					<SectionHeading title="Parents by bucket" />
					<CountBars rows={report.subtasks.parentsByBucket} total={report.subtasks.parentTasks} />
				</div>
			</div>
			<div>
				<SectionHeading title="Largest parent tasks" detail="by child count" />
				<TaskTable rows={report.subtasks.topParents} showBucket compact showWarnings={false} />
			</div>
		</div>
	);
}

function CountBars({ rows, total }: { rows: CountRow[]; total: number }) {
	//
	const max = Math.max(1, ...rows.map((row) => row.count));

	return (
		<div className="space-y-2">
			{rows.map((row) => (
				<div key={row.label} className="grid grid-cols-[9rem_minmax(0,1fr)_5rem] items-center gap-3 text-sm">
					<div className="truncate text-muted-foreground">{row.label}</div>
					<div className="h-2 overflow-hidden rounded bg-zinc-800">
						<div className="h-full rounded bg-cyan-400" style={{ width: `${Math.max(2, percent(row.count, max))}%` }} />
					</div>
					<div className="text-right tabular-nums">
						{formatNumber(row.count)}
						<span className="ml-1 text-muted-foreground">{formatPercent(row.count, total)}</span>
					</div>
				</div>
			))}
		</div>
	);
}

function TaskTable({
	rows,
	showBucket = false,
	compact = false,
	showWarnings = true,
}: {
	rows: TaskReportRow[];
	showBucket?: boolean;
	compact?: boolean;
	showWarnings?: boolean;
}) {
	//
	const [sort, setSort] = useState<TaskSort>({
		key: 'title',
		direction: 'asc',
	});
	const sortedRows = sortTaskRows(rows, sort);

	if (rows.length === 0) {
		return <div className="rounded border border-border bg-card p-4 text-sm text-muted-foreground">No tasks.</div>;
	}

	return (
		<Table>
			<thead>
				<tr>
					<SortableTh label="Task" sortKey="title" sort={sort} onSort={setSort} />
					{showBucket ? <SortableTh label="Bucket" sortKey="bucket" sort={sort} onSort={setSort} /> : null}
					<SortableTh label="Source" sortKey="source" sort={sort} onSort={setSort} />
					<SortableTh label="Priority" sortKey="priority" sort={sort} onSort={setSort} />
					<SortableTh label="Words" sortKey="words" sort={sort} onSort={setSort} align="right" />
					<SortableTh label="Children" sortKey="children" sort={sort} onSort={setSort} align="right" />
					{showWarnings ? (
						<SortableTh label="Warnings" sortKey="warnings" sort={sort} onSort={setSort} align="right" />
					) : null}
				</tr>
			</thead>
			<tbody>
				{sortedRows.map((row) => (
					<tr key={row.key}>
						<Td>
							<a href={taskHref(row.key)} className="font-medium text-cyan-300 hover:text-cyan-200">
								{row.title}
							</a>
							{compact ? null : <div className="mt-1 break-all text-xs text-muted-foreground">{row.key}</div>}
							{row.tags.length > 0 && !compact ? (
								<div className="mt-2 flex flex-wrap gap-1">
									{row.tags.slice(0, 8).map((tag) => (
										<span key={tag} className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
											{tag}
										</span>
									))}
								</div>
							) : null}
						</Td>
						{showBucket ? <Td>{formatTaskBucketLabel(row.bucket)}</Td> : null}
						<Td>{row.source}</Td>
						<Td>
							<PriorityPill priority={row.priority} />
						</Td>
						<Td align="right">{formatNumber(row.words)}</Td>
						<Td align="right">{formatNumber(row.childCount)}</Td>
						{showWarnings ? <Td align="right">{formatNumber(row.warningCount)}</Td> : null}
					</tr>
				))}
			</tbody>
		</Table>
	);
}

function Metric({ icon, label, value, detail }: { icon?: ReactNode; label: string; value: string; detail: string }) {
	//
	return (
		<div className="rounded border border-border bg-card p-4">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				{icon}
				{label}
			</div>
			<div className="mt-3 text-3xl font-semibold tabular-nums">{value}</div>
			<div className="mt-1 text-sm text-muted-foreground">{detail}</div>
		</div>
	);
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
	//
	return (
		<section className="rounded border border-border bg-zinc-950/70">
			<div className="flex items-center gap-2 border-b border-border px-4 py-3">
				{icon}
				<h2 className="text-lg font-semibold">{title}</h2>
			</div>
			<div className="p-4">{children}</div>
		</section>
	);
}

function SectionHeading({ title, detail }: { title: string; detail?: string }) {
	//
	return (
		<div className="mb-3">
			<div className="font-medium">{title}</div>
			{detail ? <div className="mt-1 text-sm text-muted-foreground">{detail}</div> : null}
		</div>
	);
}

function Table({ children }: { children: ReactNode }) {
	//
	return (
		<div className="overflow-x-auto rounded border border-border bg-card">
			<table className="w-full min-w-full border-collapse text-sm">{children}</table>
		</div>
	);
}

function SortableTh<TSort extends SortState>({
	label,
	sortKey,
	sort,
	onSort,
	align = 'left',
}: {
	label: string;
	sortKey: TSort['key'];
	sort: TSort;
	onSort: (sort: TSort) => void;
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

function PriorityPill({ priority }: { priority: string }) {
	//
	return (
		<span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${priorityClassName(priority)}`}>
			{priority}
		</span>
	);
}

function taskHref(taskKey: string) {
	//
	return `/?taskKey=${encodeURIComponent(taskKey)}&detail=expanded`;
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

function bucketFillClassName(bucket: string) {
	//
	if (bucket === 'inbox') return 'h-full rounded bg-sky-400';
	if (bucket === 'backlog') return 'h-full rounded bg-amber-400';
	if (bucket === 'active') return 'h-full rounded bg-emerald-400';
	if (bucket === 'completed') return 'h-full rounded bg-zinc-400';
	return 'h-full rounded bg-cyan-400';
}

function priorityDotClassName(priority: string) {
	//
	if (priority === 'critical') return 'bg-red-500';
	if (priority === 'high') return 'bg-orange-400';
	if (priority === 'medium') return 'bg-yellow-400';
	if (priority === 'low') return 'bg-blue-400';
	return 'bg-zinc-500';
}

function priorityClassName(priority: string) {
	//
	if (priority === 'critical') return 'bg-red-400/20 text-red-100';
	if (priority === 'high') return 'bg-orange-400/20 text-orange-100';
	if (priority === 'medium') return 'bg-yellow-400/20 text-yellow-100';
	if (priority === 'low') return 'bg-blue-400/20 text-blue-100';

	return 'bg-zinc-500/30 text-zinc-100';
}

type SortDirection = 'asc' | 'desc';

interface SortState {
	key: string;
	direction: SortDirection;
}

interface PrioritySort extends SortState {
	key: string;
}

interface TaskSort extends SortState {
	key: 'title' | 'bucket' | 'source' | 'priority' | 'words' | 'children' | 'warnings';
}

function nextSort<TSort extends SortState>(current: TSort, key: TSort['key']): TSort {
	//
	const direction = current.key === key && current.direction === 'desc' ? 'asc' : 'desc';

	return {
		...current,
		key,
		direction,
	};
}

function sortPriorityRows(rows: TaskReport['priorities'], sort: PrioritySort) {
	//
	return rows.slice().sort((left, right) => compareValues(
		getPriorityRowValue(left, sort.key),
		getPriorityRowValue(right, sort.key),
		sort.direction,
	));
}

function getPriorityRowValue(row: TaskReport['priorities'][number], key: string) {
	//
	if (key === 'priority') return priorityRank(row.priority);
	if (key === 'total') return row.total;
	if (key.startsWith('bucket:')) return getCount(row.buckets, key.slice('bucket:'.length));

	return 0;
}

function sortTaskRows(rows: TaskReportRow[], sort: TaskSort) {
	//
	return rows.slice().sort((left, right) => compareValues(
		getTaskRowValue(left, sort.key),
		getTaskRowValue(right, sort.key),
		sort.direction,
	));
}

function getTaskRowValue(row: TaskReportRow, key: TaskSort['key']) {
	//
	if (key === 'title') return row.title;
	if (key === 'bucket') return row.bucket;
	if (key === 'source') return row.source;
	if (key === 'priority') return priorityRank(row.priority);
	if (key === 'words') return row.words;
	if (key === 'children') return row.childCount;
	if (key === 'warnings') return row.warningCount;

	return '';
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

function getCount(rows: CountRow[], label: string) {
	//
	return rows.find((row) => row.label === label)?.count ?? 0;
}

function priorityRank(priority: string) {
	//
	if (priority === 'critical') return 4;
	if (priority === 'high') return 3;
	if (priority === 'medium') return 2;
	if (priority === 'low') return 1;

	return 0;
}

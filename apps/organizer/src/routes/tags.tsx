import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Tags } from 'lucide-react';
import { formatTaskBucketLabel } from '~/lib/taskBuckets';
import { formatTagGroupLabel } from '~/lib/taskTags';
import { getTaskReport, type CountRow, type TagGroupReport, type TagReportRow } from '~/server/taskReport';

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

			<section className="rounded border border-border bg-zinc-950/70">
				<div className="flex items-center gap-2 border-b border-border px-4 py-3">
					<Tags className="size-5" />
					<h2 className="text-lg font-semibold">Groups</h2>
				</div>
				<div className="grid gap-4 p-4 lg:grid-cols-2 2xl:grid-cols-3">
					{report.tags.groups.map((group) => (
						<GroupCard key={groupKey(group)} group={group} totalTags={report.tags.totalTags} />
					))}
				</div>
			</section>

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

function GroupCard({ group, totalTags }: { group: TagGroupReport; totalTags: number }) {
	//
	return (
		<div className="rounded border border-border bg-card p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="font-semibold">{formatTagGroupLabel(group.key)}</div>
					<div className="mt-1 text-sm text-muted-foreground">{group.key ?? 'plain tags'}</div>
				</div>
				<div className="text-right">
					<div className="font-semibold tabular-nums">{formatNumber(group.total)}</div>
					<div className="text-xs text-muted-foreground">{formatNumber(group.uniqueTags)} tags</div>
				</div>
			</div>
			<div className="mt-3 h-2 overflow-hidden rounded bg-zinc-800">
				<div className="h-full rounded bg-cyan-400" style={{ width: `${Math.max(2, percent(group.total, totalTags))}%` }} />
			</div>
		</div>
	);
}

function TagTable({ tags, totalTasks }: { tags: TagReportRow[]; totalTasks: number }) {
	//
	return (
		<div className="overflow-x-auto rounded border border-border bg-card">
			<table className="w-full min-w-full border-collapse text-sm">
				<thead>
					<tr>
						<Th>Tag</Th>
						<Th align="right">Count</Th>
						<Th align="right">Roots</Th>
						<Th align="right">Children</Th>
						<Th>Buckets</Th>
						<Th>Priorities</Th>
					</tr>
				</thead>
				<tbody>
					{tags.map((tag) => (
						<tr key={tag.tag}>
							<Td>
								<a href={tagHref(tag.tag)} className="font-medium text-cyan-300 hover:text-cyan-200">
									{tag.tag}
								</a>
								<div className="mt-1 text-xs text-muted-foreground">{formatPercent(tag.count, totalTasks)} of tasks</div>
							</Td>
							<Td align="right">{formatCountWithPublic(tag.count, tag.publicCount)}</Td>
							<Td align="right">{formatNumber(tag.rootCount)}</Td>
							<Td align="right">{formatNumber(tag.childCount)}</Td>
							<Td>
								<InlineCounts rows={tag.buckets} formatter={formatTaskBucketLabel} />
							</Td>
							<Td>
								<InlineCounts rows={tag.priorities} />
							</Td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function InlineCounts({ rows, formatter }: { rows: CountRow[]; formatter?: (value: string) => string }) {
	//
	const visibleRows = rows.filter((row) => row.count > 0);

	if (visibleRows.length === 0) {
		return <span className="text-muted-foreground">none</span>;
	}

	return (
		<div className="flex flex-wrap gap-1">
			{visibleRows.map((row) => (
				<span key={row.label} className="rounded border border-border px-1.5 py-0.5 text-xs">
					{formatter ? formatter(row.label) : row.label} <span className="text-muted-foreground">{row.count}</span>
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

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
	//
	return <th className={`border-b border-border bg-zinc-900 px-3 py-2 font-medium text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}

function Td({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
	//
	return <td className={`border-b border-border px-3 py-2 align-top last:border-b-0 ${align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}>{children}</td>;
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

function formatCountWithPublic(total: number, publicCount: number) {
	//
	if (publicCount === 0) return formatNumber(total);
	return `${formatNumber(total)} (${formatNumber(publicCount)} public)`;
}

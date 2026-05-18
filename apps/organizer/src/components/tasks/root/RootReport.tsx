import { CircleDot, FolderKanban, GitBranch, Lock, Tags } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CountRow, TaskReport } from '~/server/taskReport';
import {
	formatRootReportLabel,
	formatRootReportNumber,
	getRootLifecycleRows,
	getRootSectionReportRow,
	getRootSectionRows,
	rootReportPercent,
} from './rootReportUtils';

export function RootReport({ report }: { report: TaskReport }) {
	//
	const lifecycleRows = getRootLifecycleRows(report);
	const referencesSection = getRootSectionReportRow(report, 'references');
	const ideasSection = getRootSectionReportRow(report, 'ideas');
	const sectionRows = getRootSectionRows(report);
	const priorityRows = report.priorities.filter((row) => row.priority !== 'none' && row.total > 0);
	const sourceRows = report.sourceTags.slice(0, 5);

	return (
		<div className="space-y-3">
			<RootMetricGrid report={report} referencesSection={referencesSection} ideasSection={ideasSection} />
			<RootVisibilityBar
				publicCount={report.totals.publicTasks}
				privateCount={report.totals.privateTasks}
				total={report.totals.tasks}
			/>
			<RootReportSection title="Flow" icon={<GitBranch className="size-4" />}>
				<RootReportBars rows={lifecycleRows} total={report.totals.tasks} />
			</RootReportSection>
			<RootReportSection title="Sections" icon={<FolderKanban className="size-4" />}>
				<RootReportBars rows={sectionRows} total={report.totals.tasks} />
			</RootReportSection>
			{priorityRows.length > 0 ? (
				<RootReportSection title="Priorities" icon={<CircleDot className="size-4" />}>
					<RootReportBars
						rows={priorityRows.map((row) => ({ label: row.priority, count: row.total }))}
						total={report.totals.workTasks}
					/>
				</RootReportSection>
			) : null}
			{sourceRows.length > 0 ? (
				<RootReportSection title="Sources" icon={<Tags className="size-4" />}>
					<RootReportBars rows={sourceRows} total={report.totals.tasks} />
				</RootReportSection>
			) : null}
			<a
				href="/report"
				className="inline-flex w-full items-center justify-center rounded-md border border-border/80 bg-background px-3 py-2 text-sm font-medium hover:border-foreground/40 hover:bg-accent"
			>
				Open full report
			</a>
		</div>
	);
}

function RootMetricGrid({
	report,
	referencesSection,
	ideasSection,
}: {
	report: TaskReport;
	referencesSection: ReturnType<typeof getRootSectionReportRow>;
	ideasSection: ReturnType<typeof getRootSectionReportRow>;
}) {
	//
	return (
		<div className="grid grid-cols-2 gap-2">
			<RootReportMetric
				label="Files"
				value={report.totals.tasks}
				publicCount={report.totals.publicTasks}
				privateCount={report.totals.privateTasks}
			/>
			<RootReportMetric
				label="Tasks"
				value={report.totals.workTasks}
				publicCount={report.totals.publicTasks - referencesSection.publicCount}
				privateCount={report.totals.privateTasks - referencesSection.privateCount}
			/>
			<RootReportMetric
				label="References"
				value={referencesSection.total}
				publicCount={referencesSection.publicCount}
				privateCount={referencesSection.privateCount}
			/>
			<RootReportMetric
				label="Ideas"
				value={ideasSection.total}
				publicCount={ideasSection.publicCount}
				privateCount={ideasSection.privateCount}
			/>
		</div>
	);
}

function RootReportMetric({
	label,
	value,
	publicCount,
	privateCount,
}: {
	label: string;
	value: number;
	publicCount: number;
	privateCount: number;
}) {
	//
	return (
		<div className="rounded-md border border-border/80 bg-background px-3 py-2">
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="flex flex-wrap items-baseline gap-x-1.5">
				<span className="text-lg font-semibold leading-6 tabular-nums">{formatRootReportNumber(value)}</span>
				<span className="text-xs text-muted-foreground">
					({formatRootReportNumber(publicCount)} / {formatRootReportNumber(privateCount)}
					<Lock className="mx-0.5 inline size-3 align-[-0.1em]" aria-label="private" />)
				</span>
			</div>
		</div>
	);
}

function RootVisibilityBar({
	publicCount,
	privateCount,
	total,
}: {
	publicCount: number;
	privateCount: number;
	total: number;
}) {
	//
	const privatePercent = rootReportPercent(privateCount, total);
	const publicPercent = rootReportPercent(publicCount, total);

	return (
		<div className="rounded-md border border-border/80 bg-background p-3">
			<div className="flex h-2 overflow-hidden rounded bg-muted">
				<div className="h-full bg-green-400" style={{ width: `${publicPercent}%` }} />
				<div className="h-full bg-amber-400" style={{ width: `${privatePercent}%` }} />
			</div>
			<div className="mt-2 flex items-center justify-between gap-3 text-xs">
				<span className="min-w-0 truncate tabular-nums text-green-200">
					Public ({formatRootReportNumber(publicCount)} - {publicPercent}%)
				</span>
				<span className="min-w-0 truncate text-right tabular-nums text-amber-200">
					Private <Lock className="inline size-3 align-[-0.1em]" aria-label="private" /> (
					{formatRootReportNumber(privateCount)} - {privatePercent}%)
				</span>
			</div>
		</div>
	);
}

function RootReportSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
	//
	return (
		<section className="rounded-md border border-border/80 bg-background p-3">
			<div className="mb-2 flex items-center gap-2 text-sm font-medium">
				<span className="text-muted-foreground">{icon}</span>
				<span>{title}</span>
			</div>
			{children}
		</section>
	);
}

function RootReportBars({ rows, total }: { rows: CountRow[]; total: number }) {
	//
	const visibleRows = rows.filter((row) => row.count > 0);

	if (visibleRows.length === 0) {
		return <div className="text-sm text-muted-foreground">No data.</div>;
	}

	return (
		<div className="space-y-2">
			{visibleRows.map((row) => (
				<RootReportBar
					key={row.label}
					label={formatRootReportLabel(row.label)}
					count={row.count}
					total={total}
				/>
			))}
		</div>
	);
}

function RootReportBar({ label, count, total }: { label: string; count: number; total: number }) {
	//
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between gap-2 text-xs">
				<span className="truncate text-muted-foreground">{label}</span>
				<span className="shrink-0 tabular-nums">{formatRootReportNumber(count)}</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded bg-muted">
				<div
					className="h-full rounded bg-cyan-400"
					style={{ width: `${Math.max(3, rootReportPercent(count, total))}%` }}
				/>
			</div>
		</div>
	);
}

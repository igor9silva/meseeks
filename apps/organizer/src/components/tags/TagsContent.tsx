import { formatTagGroupLabel } from '~/lib/taskTags';
import type { TaskReport } from '~/server/taskReport';
import { TagTable } from './TagTable';
import { formatNumber, formatPercent, groupKey } from './tagUtils';

export function TagsContent({ report }: { report: TaskReport }) {
	//
	return (
		<>
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Metric label="Tag uses" value={formatNumber(report.tags.totalTags)} detail="total assignments" />
				<Metric
					label="Unique tags"
					value={formatNumber(report.tags.uniqueTags)}
					detail={`${formatNumber(report.tags.groups.length)} groups`}
				/>
				<Metric
					label="Tagged tasks"
					value={formatNumber(report.totals.taggedTasks)}
					detail={`${formatPercent(report.totals.taggedTasks, report.totals.tasks)} of tasks`}
				/>
				<Metric
					label="Untagged tasks"
					value={formatNumber(report.totals.untaggedTasks)}
					detail={`${formatPercent(report.totals.untaggedTasks, report.totals.tasks)} of tasks`}
				/>
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
		</>
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

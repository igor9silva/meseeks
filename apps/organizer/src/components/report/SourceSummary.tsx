import { SectionHeading } from '~/components/report/ReportPrimitives';
import { formatNumber, formatPercent, percent } from '~/components/report/reportFormat';
import type { CountRow, TaskReport } from '~/server/taskReport';
import { CountBars } from './ReportCountBars';

export function SourceSummary({ report }: { report: TaskReport }) {
	//
	return (
		<div className="space-y-3">
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
	const segments = rows.map((row, index) => {
		const offset = percent(
			rows.slice(0, index).reduce((sum, item) => sum + item.count, 0),
			total,
		);
		const width = percent(row.count, total);
		const segment = `${colors[index % colors.length]} ${offset}% ${offset + width}%`;
		return segment;
	});

	return (
		<div className="grid gap-4 rounded-md border border-border bg-card p-4 lg:min-h-96 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(14rem,1fr)] lg:items-center lg:gap-8 lg:p-6">
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
					<div
						key={row.label}
						className="grid grid-cols-[1rem_minmax(0,1fr)_4rem_5rem] items-center gap-2 text-sm"
					>
						<span
							className="size-3 rounded-full"
							style={{ backgroundColor: colors[index % colors.length] }}
						/>
						<span className="truncate">{row.label}</span>
						<span className="text-right tabular-nums text-foreground">
							{formatPercent(row.count, total)}
						</span>
						<span className="text-right tabular-nums text-muted-foreground">{formatNumber(row.count)}</span>
					</div>
				))}
			</div>
		</div>
	);
}

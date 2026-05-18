import { formatNumber, formatPercent, percent } from '~/components/report/reportFormat';
import type { CountRow } from '~/server/taskReport';

export function CountBars({ rows, total }: { rows: CountRow[]; total: number }) {
	//
	const max = Math.max(1, ...rows.map((row) => row.count));

	return (
		<div className="space-y-2">
			{rows.map((row) => (
				<div key={row.label} className="grid grid-cols-[9rem_minmax(0,1fr)_5rem] items-center gap-3 text-sm">
					<div className="truncate text-muted-foreground">{row.label}</div>
					<div className="h-2 overflow-hidden rounded bg-zinc-800">
						<div
							className="h-full rounded bg-cyan-400"
							style={{ width: `${Math.max(2, percent(row.count, max))}%` }}
						/>
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

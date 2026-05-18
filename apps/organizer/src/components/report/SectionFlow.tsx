import { SectionHeading } from '~/components/report/ReportPrimitives';
import { formatNumber, formatTaskSectionLabel, percent } from '~/components/report/reportFormat';
import type { TaskReport } from '~/server/taskReport';

export function SectionFlow({ report }: { report: TaskReport }) {
	//
	const lifecycleRows = buildLifecycleRows(report);
	const holdingSections = ['ideas', 'references', 'root', 'other'];
	const sectionByName = new Map(report.sections.map((section) => [section.section, section]));
	const maxLifecycleCount = Math.max(1, ...lifecycleRows.map((row) => row.total));

	return (
		<div className="space-y-4">
			<div>
				<SectionHeading title="Lifecycle funnel" />
				<div className="grid gap-3 lg:grid-cols-4">
					{lifecycleRows.map((row, index) => (
						<div key={row.label} className="relative rounded-md border border-border bg-card p-4">
							<div className="flex items-center justify-between gap-3">
								<div className="font-medium">{row.label}</div>
								<div className="text-2xl font-semibold tabular-nums">{formatNumber(row.total)}</div>
							</div>
							<div className="mt-3 h-2 overflow-hidden rounded bg-zinc-800">
								<div
									className={row.fillClassName}
									style={{ width: `${Math.max(4, percent(row.total, maxLifecycleCount))}%` }}
								/>
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
							{index < lifecycleRows.length - 1 ? (
								<div className="absolute -right-2 top-1/2 hidden text-muted-foreground lg:block">→</div>
							) : null}
						</div>
					))}
				</div>
			</div>

			<div>
				<SectionHeading title="Root sections" />
				<div className="grid gap-3 md:grid-cols-2">
					{holdingSections.map((section) => {
						const row = sectionByName.get(section);
						if (!row) return null;

						return (
							<div key={section} className="rounded-md border border-border bg-card p-4">
								<div className="flex items-center justify-between gap-3">
									<div className="font-medium">{formatTaskSectionLabel(section)}</div>
									<div className="text-2xl font-semibold tabular-nums">{formatNumber(row.total)}</div>
								</div>
								<div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
									<div>
										<div>public</div>
										<div className="font-medium text-foreground">
											{formatNumber(row.publicCount)}
										</div>
									</div>
									<div>
										<div>private</div>
										<div className="font-medium text-foreground">
											{formatNumber(row.privateCount)}
										</div>
									</div>
									<div>
										<div>roots</div>
										<div className="font-medium text-foreground">{formatNumber(row.rootCount)}</div>
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

function buildLifecycleRows(report: TaskReport) {
	//
	const inbox = report.sections.find((section) => section.section === 'inbox');

	return [
		{
			label: 'Inbox',
			total: inbox?.total ?? 0,
			publicCount: inbox?.publicCount ?? 0,
			privateCount: inbox?.privateCount ?? 0,
			childCount: inbox?.childCount ?? 0,
			fillClassName: 'h-full rounded bg-sky-400',
		},
		createStatusLifecycleRow(report, 'backlog', 'Backlog', 'h-full rounded bg-cyan-400'),
		createStatusLifecycleRow(report, 'active', 'Active', 'h-full rounded bg-emerald-400'),
		createStatusLifecycleRow(report, 'completed', 'Completed', 'h-full rounded bg-zinc-400'),
	];
}

function createStatusLifecycleRow(report: TaskReport, status: string, label: string, fillClassName: string) {
	//
	const row = report.statuses.find((entry) => entry.status === status);

	return {
		label,
		total: row?.total ?? 0,
		publicCount: row?.publicCount ?? 0,
		privateCount: row?.privateCount ?? 0,
		childCount: row?.childCount ?? 0,
		fillClassName,
	};
}

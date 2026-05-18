import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Maximize2, Minimize2, PanelLeftClose } from 'lucide-react';
import { getTaskReport } from '~/server/taskReport';
import { RootReport } from './RootReport';

export function RootCurrentPanel({
	isExpanded,
	onCollapse,
	onExpandedToggle,
}: {
	isExpanded: boolean;
	onCollapse: () => void;
	onExpandedToggle: () => void;
}) {
	//
	const getTaskReportServer = useServerFn(getTaskReport);
	const reportQuery = useQuery({
		queryKey: ['task-report'],
		queryFn: () => getTaskReportServer({ data: {} }),
		refetchInterval: 2000,
	});
	const report = reportQuery.data;

	return (
		<section className="flex h-full min-h-0 flex-col overflow-hidden border border-border/80 bg-card">
			<header className="flex items-start justify-between gap-3 border-b border-border/80 p-4">
				<div className="min-w-0">
					<h2 className="text-xl font-semibold leading-7">Organizer</h2>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						aria-label="Collapse left panel"
						title="Collapse left panel"
						onClick={onCollapse}
						className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
					>
						<PanelLeftClose className="size-4" />
					</button>
					<button
						type="button"
						aria-label={isExpanded ? 'Collapse root panel' : 'Expand root panel'}
						title={isExpanded ? 'Collapse root panel' : 'Expand root panel'}
						onClick={onExpandedToggle}
						className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
					>
						{isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
					</button>
				</div>
			</header>
			<div className="min-h-0 flex-1 overflow-auto p-3">
				{reportQuery.isPending ? <div className="text-sm text-muted-foreground">Loading report...</div> : null}
				{reportQuery.isError ? (
					<div className="text-sm text-muted-foreground">Could not load report.</div>
				) : null}
				{report && !report.health.isReady ? (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
						Task indexes unavailable.
					</div>
				) : null}
				{report && report.health.isReady ? <RootReport report={report} /> : null}
			</div>
		</section>
	);
}

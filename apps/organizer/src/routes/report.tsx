import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ReportContent } from '~/components/report/ReportContent';
import { ReportShell } from '~/components/report/ReportShell';
import { getTaskReport } from '~/server/taskReport';

// react-doctor-disable-next-line react-doctor/only-export-components -- TanStack Router file routes must export Route.
export const Route = createFileRoute('/report')({
	head: () => ({
		meta: [{ title: 'Report' }],
	}),
	component: ReportRoute,
});

export function ReportRoute() {
	//
	const getTaskReportServer = useServerFn(getTaskReport);
	const canQuery = typeof window !== 'undefined';
	const reportQuery = useQuery({
		queryKey: ['task-report'],
		queryFn: () => getTaskReportServer({ data: {} }),
		enabled: canQuery,
	});

	if (!canQuery || reportQuery.isPending) {
		return <ReportShell title="Report">Loading report…</ReportShell>;
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
			<ReportContent report={report} />
		</ReportShell>
	);
}

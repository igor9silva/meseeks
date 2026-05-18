import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { TagsContent } from '~/components/tags/TagsContent';
import { TagsShell } from '~/components/tags/TagsShell';
import { getTaskReport } from '~/server/taskReport';

export const Route = createFileRoute('/tags')({
	head: () => ({
		meta: [{ title: 'Tags' }],
	}),
	component: TagsRoute,
});

function TagsRoute() {
	//
	const getTaskReportServer = useServerFn(getTaskReport);
	const [hasMounted, setHasMounted] = useState(false);
	const reportQuery = useQuery({
		queryKey: ['task-report'],
		queryFn: () => getTaskReportServer({ data: {} }),
		enabled: hasMounted,
	});

	useEffect(() => {
		setHasMounted(true);
	}, []);

	if (!hasMounted || reportQuery.isPending) {
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
			<TagsContent report={report} />
		</TagsShell>
	);
}

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { WorkspaceApp } from '~/components/WorkspaceApp';

const searchSchema = z.object({
	mode: z.enum(['reg', 'dev']).optional(),
});

export const Route = createFileRoute('/$')({
	validateSearch: searchSchema,
	component: RouteComponent,
});

function RouteComponent() {
	//
	const params = Route.useParams();
	const search = Route.useSearch();
	return <WorkspaceApp mode={search.mode ?? 'reg'} routePath={`/${params._splat}`} />;
}

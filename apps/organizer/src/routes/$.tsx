import { createFileRoute, useLocation } from '@tanstack/react-router';
import { TaskExplorerPage } from '~/components/tasks/TaskExplorerPage';
import { explorerRouteSearchSchema } from '~/lib/explorerSearchParams';

export const Route = createFileRoute('/$')({
	validateSearch: explorerRouteSearchSchema,
	component: RouteComponent,
});

function RouteComponent() {
	//
	const search = Route.useSearch();
	const location = useLocation();

	return <TaskExplorerPage search={search} routePath={location.pathname} />;
}

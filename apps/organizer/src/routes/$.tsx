import { createFileRoute, useLocation } from '@tanstack/react-router';
import { TaskExplorerPage } from '~/components/tasks/TaskExplorerPage';
import { explorerRouteSearchSchema } from '~/lib/explorerSearchParams';

// react-doctor-disable-next-line react-doctor/only-export-components -- TanStack Router file routes must export Route.
export const Route = createFileRoute('/$')({
	validateSearch: explorerRouteSearchSchema,
	component: RouteComponent,
});

export function RouteComponent() {
	//
	const search = Route.useSearch();
	const location = useLocation();

	return <TaskExplorerPage search={search} routePath={location.pathname} />;
}

import { createFileRoute } from '@tanstack/react-router';
import { TaskExplorerPage } from '~/components/tasks/TaskExplorerPage';
import { explorerRouteSearchSchema, parseExplorerQuery } from '~/lib/explorerSearchParams';
import { getExplorerSnapshot, getTaskDetail } from '~/server/taskExplorer';

export const Route = createFileRoute('/')({
	validateSearch: explorerRouteSearchSchema,
	loaderDeps: ({ search }) => ({
		search,
	}),
	loader: async ({ deps }) => {
		const explorerSnapshot = await getExplorerSnapshot({ data: parseExplorerQuery(deps.search) });
		const taskDetail =
			deps.search.taskKey === undefined ? null : await getTaskDetail({ data: { taskKey: deps.search.taskKey } });

		return {
			explorerSnapshot,
			taskDetail,
			taskDetailKey: deps.search.taskKey ?? null,
		};
	},
	component: RouteComponent,
});

function RouteComponent() {
	//
	const search = Route.useSearch();
	const initialData = Route.useLoaderData();

	return (
		<TaskExplorerPage
			search={search}
			initialSnapshot={initialData.explorerSnapshot}
			initialTaskDetail={initialData.taskDetail}
			initialTaskDetailKey={initialData.taskDetailKey}
		/>
	);
}

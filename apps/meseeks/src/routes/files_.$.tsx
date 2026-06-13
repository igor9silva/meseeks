import { createFileRoute } from '@tanstack/react-router';
import { FileExplorerView } from '~/components/FileExplorerView';

export const Route = createFileRoute('/files_/$')({
	component: RouteComponent,
});

function RouteComponent() {
	//
	const params = Route.useParams();
	return <FileExplorerView path={`/${params._splat}`} />;
}

import { createFileRoute } from '@tanstack/react-router';
import { FileExplorerView } from '~/components/FileExplorerView';

export const Route = createFileRoute('/files')({
	component: RouteComponent,
});

function RouteComponent() {
	//
	return <FileExplorerView path="/" />;
}

import { createFileRoute } from '@tanstack/react-router';
import { FilesystemRoute } from '~/components/TestConsole/FilesystemRoute';

export const Route = createFileRoute('/$')({
	component: RootRoute,
});

function RootRoute() {
	//
	const { _splat } = Route.useParams();

	return <FilesystemRoute path={_splat ?? ''} />;
}

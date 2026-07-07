import { createFileRoute } from '@tanstack/react-router';
import { FilesystemRoute } from '~/components/TestConsole/FilesystemRoute';

export const Route = createFileRoute('/skills_/$id')({
	component: RouteComponent,
});

function RouteComponent() {
	//
	const { id } = Route.useParams();

	return <FilesystemRoute path={`.pro/skills/${id}`} />;
}

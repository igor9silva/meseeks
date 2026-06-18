import { createFileRoute } from '@tanstack/react-router';
import { FilesystemRoute } from '~/components/TestConsole/FilesystemRoute';

export const Route = createFileRoute('/skills_/new')({
	component: RouteComponent,
});

export default function RouteComponent() {
	//
	return <FilesystemRoute path=".pro/skills/new" />;
}

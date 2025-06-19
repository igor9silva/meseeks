import { createFileRoute } from '@tanstack/react-router';
import { NotificationSettings } from '~/components/NotificationSettings';

export const Route = createFileRoute('/notifications')({
	component: RouteComponent,
});

function RouteComponent() {
	//
	return (
		<div className="flex flex-col gap-6 p-4 max-w-2xl">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
				<p className="text-muted-foreground">Manage your notification preferences for task updates.</p>
			</div>

			<NotificationSettings />
		</div>
	);
}

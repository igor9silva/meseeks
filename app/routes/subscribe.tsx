import { createFileRoute } from '@tanstack/react-router';
import { SubscribeCard } from '~/components/SubscribeCard';

export const Route = createFileRoute('/subscribe')({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex flex-col gap-2 p-4">
			<SubscribeCard />
		</div>
	);
}

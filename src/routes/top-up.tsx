import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { api } from 'convex/_generated/api';
import { TopUpCard } from '~/components/TopUpCard';
import { TopUpItem } from '~/components/TopUpItem';

export const Route = createFileRoute('/top-up')({
	component: RouteComponent,
});

export function RouteComponent() {
	//
	const query = convexQuery(api.topUps.public.findAllWaiting, {});
	const { data: waitingTopUps } = useSuspenseQuery(query);

	track('top-up', {
		waitingTopUps: waitingTopUps.length,
	});

	if (waitingTopUps.length > 0) {
		return (
			<div className="flex flex-col gap-2 p-4">
				<div className="">
					<h3 className="text-lg font-semibold">You have started topUps</h3>
					<span className="text-sm text-muted-foreground">Pay or cancel them before starting a new one.</span>
				</div>
				<ul className="flex flex-col gap-2">
					{waitingTopUps.map((topUp) => (
						<TopUpItem key={topUp._id} topUp={topUp} />
					))}
				</ul>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 p-4">
			<TopUpCard />
			<TopUpHistory />
		</div>
	);
}

function TopUpHistory() {
	//
	const query = convexQuery(api.topUps.public.findAllHistory, {});
	const { data: history } = useSuspenseQuery(query);

	return (
		<ul className="flex flex-col gap-2">
			{history.map((topUp) => (
				<TopUpItem key={topUp._id} topUp={topUp} />
			))}
		</ul>
	);
}

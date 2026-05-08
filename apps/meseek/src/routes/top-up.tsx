import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { TopUpCard } from '~/components/TopUpCard';
import { TopUpItem } from '~/components/TopUpItem';
import { useTopUpHistory, useWaitingTopUps } from '~/hooks/query/useTopUps';

export const Route = createFileRoute('/top-up')({
	component: RouteComponent,
});

export function RouteComponent() {
	//
	const { waitingTopUps } = useWaitingTopUps();

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
	const { topUpHistory } = useTopUpHistory();

	return (
		<ul className="flex flex-col gap-2">
			{topUpHistory.map((topUp) => (
				<TopUpItem key={topUp._id} topUp={topUp} />
			))}
		</ul>
	);
}

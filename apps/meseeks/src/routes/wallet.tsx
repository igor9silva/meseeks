import { createFileRoute, Link } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { asDollars } from 'lib/money';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@reactor/ui/card';
import { TopUpItem } from '~/components/TopUpItem';
import { useTopUpHistory, useWaitingTopUps } from '~/hooks/query/useTopUps';
import { useCurrentUser } from '~/hooks/useCurrentUser';

export const Route = createFileRoute('/wallet')({
	component: WalletRoute,
});

function WalletRoute() {
	//
	const user = useCurrentUser();
	const { waitingTopUps } = useWaitingTopUps();
	const { topUpHistory } = useTopUpHistory();
	const energyBalance = user.energyBalance ?? 0n;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-2">
						<Wallet className="size-5" />
						<CardTitle>Wallet</CardTitle>
					</div>
					<Button asChild>
						<Link to="/top-up">Top up</Link>
					</Button>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-semibold tabular-nums">
						{asDollars({ bigInt: energyBalance, precision: 6 })} energy
					</div>
				</CardContent>
			</Card>

			<WalletSection title="Waiting top-ups" empty="No waiting top-ups.">
				{waitingTopUps.map((topUp) => (
					<TopUpItem key={topUp._id} topUp={topUp} />
				))}
			</WalletSection>

			<WalletSection title="Top-up history" empty="No top-ups yet.">
				{topUpHistory.map((topUp) => (
					<TopUpItem key={topUp._id} topUp={topUp} />
				))}
			</WalletSection>
		</div>
	);
}

function WalletSection({ children, empty, title }: { children: React.ReactNode; empty: string; title: string }) {
	//
	const items = Array.isArray(children) ? children.filter(Boolean) : children;
	const hasItems = Array.isArray(items) ? items.length > 0 : Boolean(items);

	return (
		<section className="flex flex-col gap-2">
			<h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
			{hasItems ? (
				<ul className="flex flex-col gap-2">{items}</ul>
			) : (
				<p className="text-sm text-muted-foreground">{empty}</p>
			)}
		</section>
	);
}

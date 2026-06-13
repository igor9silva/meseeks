import { createFileRoute, Link } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { asDollars } from 'lib/money';
import { useRef } from 'react';
import { TransactionsTab } from '~/components/wallet/TransactionsTab';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@reactor/ui/card';
import { useCurrentUser } from '~/hooks/useCurrentUser';

export const Route = createFileRoute('/wallet')({
	component: RouteComponent,
});

function RouteComponent() {
	//
	const user = useCurrentUser();
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const balance = user.balanceUSD ?? 0n;

	track('wallet', {
		balance: asDollars({ bigInt: balance, precision: 10 }),
	});

	return (
		<div ref={scrollContainerRef} className="flex h-full flex-col gap-4 overflow-y-auto p-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">Wallet</h1>
					<p className="text-sm text-muted-foreground">Balance and transaction history.</p>
				</div>
				<Link to="/top-up">
					<Button>Top up</Button>
				</Link>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Available balance</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-semibold tracking-normal">
						{asDollars({ bigInt: balance, precision: 6 })}
					</div>
				</CardContent>
			</Card>

			<div className="min-h-0 flex-1">
				<TransactionsTab scrollContainerRef={scrollContainerRef} />
			</div>
		</div>
	);
}

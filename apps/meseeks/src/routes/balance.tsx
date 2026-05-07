import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { asDollars } from 'lib/money';
import { useCallback, useRef } from 'react';
import { z } from 'zod/v3';
import { ActiveTasksTab } from '~/components/balance/ActiveTasksTab';
import { LowBalanceWarning } from '~/components/balance/LowBalanceWarning';
import { TopUpSection } from '~/components/balance/TopUpSection';
import { TransactionsTab } from '~/components/balance/TransactionsTab';
import { EnergyTooltip } from '~/components/EnergyTooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@reactor/ui/tabs';
import { useLockedBalance } from '~/hooks/query/useTransactions';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { useIsPro } from '~/hooks/useIsPro';

const searchSchema = z.object({
	tab: z.enum(['transactions', 'active-tasks']).optional(),
});

export const Route = createFileRoute('/balance')({
	component: RouteComponent,
	validateSearch: searchSchema,
});

function RouteComponent() {
	//
	const user = useCurrentUser();
	const navigate = useNavigate();
	const { tab } = Route.useSearch();
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const { lockedBalance } = useLockedBalance();

	const { isPro } = useIsPro();

	const currentTab = tab || 'transactions';

	const handleTabChange = useCallback(
		(value: string) => {
			const newTab = value === 'transactions' ? undefined : (value as 'active-tasks');
			navigate({
				to: '/balance',
				search: { tab: newTab },
				replace: true,
			});
		},
		[navigate],
	);

	track('balance', {
		balance: asDollars({ bigInt: user.balanceUSD ?? 0n, precision: 10 }),
		lockedBalance: asDollars({ bigInt: lockedBalance, precision: 10 }),
	});

	return (
		<div ref={scrollContainerRef} className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
			<Link to="." search={(prev) => ({ ...prev, tab: 'active-tasks' })}>
				<div className="flex flex-col gap-0">
					<h1 className="text-2xl font-bold">Balance</h1>
					<span>
						Your current non-locked balance is{' '}
						<EnergyTooltip>
							<span className="font-bold">
								{asDollars({ bigInt: user.balanceUSD ?? 0n, precision: 6 })}⚡
							</span>
						</EnergyTooltip>
						.
					</span>
					{lockedBalance > 0 && (
						<span>
							Other{' '}
							<EnergyTooltip>
								<span className="font-bold">
									{asDollars({ bigInt: lockedBalance, precision: 6 })}⚡
								</span>
							</EnergyTooltip>{' '}
							in active tasks.
						</span>
					)}
				</div>
			</Link>

			<LowBalanceWarning balance={user.balanceUSD ?? 0n} />
			<TopUpSection isPro={isPro} user={user} />

			<Tabs value={currentTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="transactions">Transactions</TabsTrigger>
					<TabsTrigger value="active-tasks">Tasks locking energy</TabsTrigger>
				</TabsList>

				<TabsContent value="transactions" className="flex-1 mt-4">
					<TransactionsTab scrollContainerRef={scrollContainerRef} />
				</TabsContent>

				<TabsContent value="active-tasks" className="flex-1 mt-4">
					<ActiveTasksTab scrollContainerRef={scrollContainerRef} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

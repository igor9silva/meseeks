import { createFileRoute } from '@tanstack/react-router';
import { zid } from 'convex-helpers/server/zod3';
import { useMutation } from 'convex/react';
import type { Id } from 'convex/_generated/dataModel';
import { usePayment } from '~/hooks/usePayment';
import { cn } from '@pro/ui/lib/utils';
import { api } from 'convex/_generated/api';

import { asDollars } from 'lib/money';
import { BasicError } from '~/components/BasicError';
import { topUpStatusColors } from '~/components/TopUpItem';
import { Badge } from '@pro/ui/badge';
import { Button } from '@pro/ui/button';
import { Card, CardContent, CardFooter } from '@pro/ui/card';
import { useTopUp } from '~/hooks/query/useTopUps';

export const Route = createFileRoute('/top-up_/$id')({
	component: RouteComponent,
});

export function RouteComponent({ className }: { className?: string }) {
	//
	const { id } = Route.useParams();
	const parsedTopUpId = zid('topUps').safeParse(id);
	if (!parsedTopUpId.success) return <BasicError text="Top up not found." />;

	return <TopUpDetail topUpId={parsedTopUpId.data} className={className} />;
}

function TopUpDetail({ topUpId, className }: { topUpId: Id<'topUps'>; className?: string }) {
	//
	const { topUp } = useTopUp(topUpId);
	const discard = useMutation(api.topUps.discard);
	const { pay, isPending, error } = usePayment(topUp);

	if (error) {
		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-4">
				<BasicError text={error.message} className="h-fit" />
			</div>
		);
	}

	return (
		<Card className={cn('max-h-fit rounded-none border-none', className)}>
			<CardContent className="p-4">
				<div className="flex flex-col gap-4">
					{/* Header with Status */}
					<div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
						<div className="flex flex-col gap-1">
							<h2 className="text-xl font-bold sm:text-2xl">Order details</h2>
							<p className="break-normal text-xs text-muted-foreground hyphens-auto">{topUp._id}</p>
						</div>
						<Badge
							className={cn(
								'w-fit px-3 py-1 text-sm font-medium capitalize',
								topUpStatusColors[topUp.status],
							)}
						>
							{topUp.status}
						</Badge>
					</div>

					{/* Amount Section */}
					<div className="flex flex-col gap-2 rounded-xl bg-muted p-4">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-muted-foreground sm:text-base">
								{topUp.symbol}
							</span>
							<span className="text-lg font-bold tabular-nums sm:text-xl">
								{asDollars({ bigInt: topUp.amount })}
							</span>
						</div>
					</div>

					{/* TopUp Details */}
					<div className="grid gap-4">
						<div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
							<span className="whitespace-nowrap text-muted-foreground">Description</span>
							<span className="break-normal font-medium hyphens-auto">{topUp.description}</span>
						</div>
					</div>
				</div>
			</CardContent>
			{topUp.status === 'waiting' && (
				<CardFooter className="flex flex-col justify-end gap-2 border-t p-4 sm:flex-row">
					<Button
						className="w-full sm:w-24"
						variant="destructive"
						disabled={isPending}
						onClick={() => discard({ topUpId })}
					>
						Discard
					</Button>
					<Button className="w-full sm:w-24" variant="default" disabled={isPending} onClick={() => pay()}>
						{isPending ? 'Paying...' : 'Pay'}
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}

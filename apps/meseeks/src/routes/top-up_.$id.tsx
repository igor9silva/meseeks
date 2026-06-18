import { createFileRoute } from '@tanstack/react-router';
import { zid } from 'convex-helpers/server/zod3';
import { useMutation } from 'convex/react';
import { usePayment } from '~/hooks/usePayment';
import { cn } from '@reactor/ui/lib/utils';
import { api } from 'convex/_generated/api';

import { asDollars } from 'lib/money';
import { BasicError } from '~/components/BasicError';
import { topUpStatusColors } from '~/components/TopUpItem';
import { Badge } from '@reactor/ui/badge';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardFooter } from '@reactor/ui/card';
import { useTopUp } from '~/hooks/query/useTopUps';

export const Route = createFileRoute('/top-up_/$id')({
	params: {
		parse: (params) => ({
			id: zid('top_ups').parse(params.id),
		}),
	},
	component: RouteComponent,
});

export function RouteComponent({ className }: { className?: string }) {
	//
	const { id } = Route.useParams();
	const { topUp } = useTopUp(id);

	const discard = useMutation(api.topUps.discard);

	const { pay, isPending, error } = usePayment({ paymentUrl: topUp.paymentUrl ?? '' });

	if (error) {
		//
		return (
			<div className="flex flex-col items-center justify-center h-full w-full gap-4">
				<BasicError text={error.message} className="h-fit" />
			</div>
		);
	}

	return (
		<Card className={cn('max-h-fit border-none rounded-none', className)}>
			<CardContent className="p-4">
				<div className="flex flex-col gap-4">
					{/* Header with Status */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
						<div className="flex flex-col gap-1">
							<h2 className="text-xl sm:text-2xl font-bold">Order details</h2>
							<p className="text-xs sm:text-sm text-muted-foreground break-normal hyphens-auto">
								{topUp._id}
							</p>
						</div>
						<Badge
							className={cn(
								'w-fit px-3 py-1 text-sm font-medium capitalize',
								topUpStatusColors[topUp.status as keyof typeof topUpStatusColors],
							)}
						>
							{topUp.status}
						</Badge>
					</div>

					{/* Amount Section */}
					<div className="flex flex-col gap-2 p-4 bg-muted rounded-xl">
						<div className="flex items-center justify-between">
							<span className="text-sm sm:text-base font-medium text-muted-foreground">Energy</span>
							<span className="text-lg sm:text-xl font-bold tabular-nums">
								{asDollars({ bigInt: topUp.amount })}
							</span>
							{/* <span className="font-medium capitalize break-all">{topUp.chain}</span> */}
						</div>
					</div>

					{/* TopUp Details */}
					<div className="grid gap-4">
						<div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
							{/* <span className="text-muted-foreground whitespace-nowrap">Chain</span>
							<span className="font-medium capitalize break-all">{topUp.chain}</span>

							<span className="text-muted-foreground whitespace-nowrap">Recipient</span>
							<span className="font-medium break-all">{topUp.to}</span> */}

							<span className="text-muted-foreground whitespace-nowrap">Provider</span>
							<span className="font-medium break-normal hyphens-auto">{topUp.provider}</span>
						</div>
					</div>
				</div>
			</CardContent>
			{topUp.status === 'waiting' && (
				<CardFooter className="flex flex-col sm:flex-row justify-end gap-2 p-4 border-t">
					<Button
						className="w-full sm:w-24"
						variant="destructive"
						disabled={isPending}
						onClick={() => discard({ topUpId: id })}
					>
						Discard
					</Button>
					<Button
						className="w-full sm:w-24"
						variant="default"
						disabled={isPending || !topUp.paymentUrl}
						onClick={() => pay()}
					>
						{isPending ? 'Paying...' : 'Pay'}
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}

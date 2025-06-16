import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { usePayment } from '~/hooks/usePayment';
import { cn } from '~/lib/utils';

import { asDollars } from 'convex/lib/money';
import { BasicError } from '~/components/BasicError';
import { topUpStatusColors } from '~/components/TopUpItem';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardFooter } from '~/components/ui/card';

export const Route = createFileRoute('/top-up_/$id')({
	component: RouteComponent,
});

export function RouteComponent({ className }: { className?: string }) {
	//
	const { id } = Route.useParams();

	const query = convexQuery(api.topUps.public.findOne, {
		topUpId: id as Id<'topUps'>,
	});
	const { data: topUp } = useSuspenseQuery(query);

	const discard = useMutation(api.topUps.public.discard);

	const { pay, isPending, error } = usePayment(topUp);

	if (error) {
		//
		return (
			<div className="flex flex-col items-center justify-center h-full w-full gap-4">
				<BasicError text={error.message} className="h-fit" />
			</div>
		);
	}

	track('top-up/$id', {
		topUpId: id,
	});

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
					<div className="flex flex-col gap-2 p-4 bg-muted rounded-lg">
						<div className="flex items-center justify-between">
							<span className="text-sm sm:text-base font-medium text-muted-foreground">
								{topUp.symbol}
							</span>
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

							<span className="text-muted-foreground whitespace-nowrap">Description</span>
							<span className="font-medium break-normal hyphens-auto">{topUp.description}</span>
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
						onClick={() => discard({ topUpId: id as Id<'topUps'> })}
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

import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { usePayment } from '~/hooks/usePayment';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardFooter } from '~/components/ui/card';

export const Route = createFileRoute('/subscribe_/$id')({
	component: RouteComponent,
});

export function RouteComponent() {
	const query = convexQuery(api.subscriptions.public.findActive, {});
	const { data } = useSuspenseQuery(query);
	const sub = data[0];
	if (!sub) {
		return <div className="p-4">No subscription found.</div>;
	}

	const { pay, isPending, error } = usePayment(sub);

	if (error) {
		return <div className="p-4">Failed to start payment: {error.message}</div>;
	}

	return (
		<Card className="max-h-fit border-none rounded-none">
			<CardContent className="p-4 flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-bold break-all">{sub._id}</h2>
					<Badge>{sub.status}</Badge>
				</div>
			</CardContent>
			{sub.status === 'pending' && (
				<CardFooter className="flex justify-end gap-2">
					<Button onClick={() => pay()} disabled={isPending}>
						{isPending ? 'Paying...' : 'Pay'}
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}

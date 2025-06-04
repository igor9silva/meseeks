import { useNavigate } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { useAction, useQuery } from 'convex/react';
import { asBigInt } from 'convex/utils/money';
import { toast } from 'sonner';
import { z } from 'zod';
import { DollarCredits } from '~/components/DollarCredits';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { useHandleSubmit } from '~/hooks/useHandleSubmit';
import { useSubmitHotkey } from '~/hooks/useSubmitHotkey';

export function TopUpCard() {
	//
	const navigate = useNavigate();
	const startTopUp = useAction(api.topUps.public.startTopUp);
	const startSubscription = useAction(api.subscriptions.public.startSubscription);
	const activeSubs = useQuery(api.subscriptions.public.findActive, {});

	const handleSubmit = useHandleSubmit({
		schema: z.object({
			amount: z.string().pipe(z.coerce.number().min(10)),
		}),
		handler: async ({ amount }) => {
			//
			try {
				const topUpId = await startTopUp({
					symbol: 'USD',
					amount: asBigInt({ dollars: amount }),
					chain: 'base',
				});

				navigate({ to: '/top-up/$id', params: { id: topUpId } });
				//
			} catch (error) {
				console.error(error);
				toast.error('Failed to start top up. We are working on fixing this.');
			}
		},
		onParseError: () => {
			toast.error('Minimum top up amount is $10.');
		},
	});

	const handleSubscribe = async (product: 'pro' | 'founder') => {
		try {
			const { id, paymentUrl } = await startSubscription({ product });
			navigate({ to: '/subscribe/$id', params: { id } });
			// also open payment url immediately in case navigation fails
			location.href = paymentUrl;
		} catch (error) {
			console.error(error);
			toast.error('Failed to start subscription.');
		}
	};

	// confirm on CMD+Enter
	const handleKeyDown = useSubmitHotkey();

	if (!activeSubs || activeSubs.length === 0) {
		return (
			<Card className="max-h-fit border-none rounded-none prose">
				<CardContent className="p-4 flex flex-col gap-2">
					<Button onClick={() => handleSubscribe('pro')} variant="default">
						Subscribe $20/mo
					</Button>
					<Button onClick={() => handleSubscribe('founder')} variant="secondary">
						Buy Founder Pack $500
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="max-h-fit border-none rounded-none prose">
			<CardContent className="p-0">
				<form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-row items-center gap-2">
					<DollarCredits className="font-semibold" />
					<Input type="string" name="amount" placeholder="Amount" required defaultValue={50} />
					<Button variant="default" type="submit">
						Top up
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

import { useNavigate } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { asBigInt } from 'convex/lib/money';
import { useAction } from 'convex/react';
import { toast } from 'sonner';
import { z } from 'zod';
import { EnergyCredits } from '~/components/EnergyCredits';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { useHandleSubmit } from '~/hooks/useHandleSubmit';
import { useSubmitHotkey } from '~/hooks/useSubmitHotkey';

export function TopUpCard() {
	//
	const navigate = useNavigate();
	const startTopUp = useAction(api.topUps.public.startTopUp);

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

	// confirm on CMD+Enter
	const handleKeyDown = useSubmitHotkey();

	return (
		<Card className="max-h-fit border-none rounded-none prose">
			<CardContent className="p-0">
				<form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-row items-center gap-2">
					<EnergyCredits className="font-semibold" />
					<Input type="string" name="amount" placeholder="Amount" required defaultValue={50} />
					<Button variant="default" type="submit">
						Top up
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

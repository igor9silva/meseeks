import { useNavigate } from '@tanstack/react-router';
import { asBigInt } from 'lib/money';
import { useAction } from 'convex/react';
import { toast } from 'sonner';
import { z } from 'zod/v3';
import { EnergyTooltip } from '~/components/EnergyTooltip';
import { Button } from '@reactor/ui/button';
import { Card, CardContent } from '@reactor/ui/card';
import { Input } from '@reactor/ui/input';
import { useHandleSubmit } from '@reactor/ui/hooks/useHandleSubmit';
import { useSubmitHotkey } from '@reactor/ui/hooks/useSubmitHotkey';
import { api } from 'convex/_generated/api';

export function TopUpCard() {
	//
	const navigate = useNavigate();
	const startTopUp = useAction(api.topUps.startTopUp);

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
					<EnergyTooltip>⚡</EnergyTooltip>
					<Input type="string" name="amount" placeholder="Amount" required defaultValue={50} />
					<Button variant="default" type="submit">
						Top up
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

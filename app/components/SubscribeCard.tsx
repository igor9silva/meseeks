import { useNavigate } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { useAction } from 'convex/react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';

export function SubscribeCard() {
	const navigate = useNavigate();
	const startSubscription = useAction(api.subscriptions.public.startSubscription);

	const handleStart = async (plan: 'pro' | 'founder') => {
		try {
			const id = await startSubscription({ plan });
			navigate({ to: '/subscribe/$id', params: { id } });
		} catch (error) {
			console.error(error);
			toast.error('Failed to start subscription.');
		}
	};

	return (
		<Card className="max-h-fit border-none rounded-none prose">
			<CardContent className="p-4 flex flex-col gap-2">
				<Button onClick={() => handleStart('pro')} variant="default">
					Subscribe $20/mo
				</Button>
				<Button onClick={() => handleStart('founder')} variant="secondary">
					Buy Founder Pack $500
				</Button>
			</CardContent>
		</Card>
	);
}

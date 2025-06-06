import { useNavigate } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { useAction } from 'convex/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { FaqSection, FounderCard, ProCard } from '~/components/subscribe';
import { useIsPro } from '~/hooks/useIsPro';
import { Route } from '~/routes/subscribe';

export function SubscribePage({ route }: { route: typeof Route }) {
	//
	const navigate = useNavigate();
	const startSubscription = useAction(api.subscriptions.public.startSubscription);
	const { isPro } = useIsPro();

	// redirect to balance if already subscribed
	useEffect(() => {
		if (isPro) {
			navigate({ to: '/balance' });
		}
	}, [isPro, navigate]);

	const handleSubscribe = async (product: 'pro' | 'founder') => {
		try {
			const { paymentUrl } = await startSubscription({ product });
			location.href = paymentUrl;
		} catch (error) {
			console.error(error);
			toast.error('Failed to start subscription.');
		}
	};

	// don't render if already subscribed (will redirect)
	if (isPro) return null;

	return (
		<div className="flex flex-col gap-8 my-6 h-full p-4">
			<div className="text-center space-y-4">
				<h1 className="text-4xl font-bold tracking-tight">Choose your path</h1>
				{/* <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
					The following offers are available during research preview, and are subject to change.
				</p> */}
			</div>

			<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
				<ProCard onSubscribe={handleSubscribe} />
				<FounderCard onSubscribe={handleSubscribe} />
			</div>

			<FaqSection />

			<div className="text-center text-sm text-muted-foreground pb-4">
				<p>
					This is a <strong>research preview</strong> app. Expect issues.
				</p>
				<p>© 2025 isPro. All rights reserved.</p>
			</div>
		</div>
	);
}

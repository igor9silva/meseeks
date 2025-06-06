import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { useAction } from 'convex/react';
import { Crown, Sparkles, Star, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { useIsPro } from '~/hooks/useIsPro';

export const Route = createFileRoute('/subscribe')({
	component: RouteComponent,
});

function RouteComponent() {
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
		<div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-muted/20">
			<div className="w-full max-w-4xl space-y-8">
				<div className="text-center space-y-4">
					<h1 className="text-4xl font-bold tracking-tight">Choose Your Plan</h1>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Get access to powerful AI capabilities and unlock the full potential of Meseeks
					</p>
				</div>

				<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
					{/* Pro Subscription */}
					<Card className="relative border-2 hover:border-primary/50 transition-colors">
						<CardHeader className="text-center pb-8">
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
								<Zap className="w-8 h-8 text-primary" />
							</div>
							<CardTitle className="text-2xl">Pro Subscription</CardTitle>
							<CardDescription className="text-base">
								Monthly subscription with credits included
							</CardDescription>
							<div className="text-4xl font-bold mt-4">
								$20
								<span className="text-lg font-normal text-muted-foreground">/month</span>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							<ul className="space-y-3">
								<li className="flex items-center gap-3">
									<Star className="w-5 h-5 text-green-500 flex-shrink-0" />
									<span>$10 credits included monthly</span>
								</li>
								<li className="flex items-center gap-3">
									<Star className="w-5 h-5 text-green-500 flex-shrink-0" />
									<span>Ability to top up additional credits</span>
								</li>
								<li className="flex items-center gap-3">
									<Star className="w-5 h-5 text-green-500 flex-shrink-0" />
									<span>Priority support</span>
								</li>
								<li className="flex items-center gap-3">
									<Star className="w-5 h-5 text-green-500 flex-shrink-0" />
									<span>Full platform access</span>
								</li>
							</ul>
							<Button
								onClick={() => handleSubscribe('pro')}
								variant="default"
								size="lg"
								className="w-full"
							>
								<Sparkles className="w-4 h-4 mr-2" />
								Subscribe to Pro
							</Button>
						</CardContent>
					</Card>

					{/* Founder Package */}
					<Card className="relative border-2 border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
						<div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
							<span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
								Best Value
							</span>
						</div>
						<CardHeader className="text-center pb-8">
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
								<Crown className="w-8 h-8 text-amber-600 dark:text-amber-400" />
							</div>
							<CardTitle className="text-2xl">Founder Package</CardTitle>
							<CardDescription className="text-base">
								One-time payment for early supporters
							</CardDescription>
							<div className="text-4xl font-bold mt-4">
								$500
								<span className="text-lg font-normal text-muted-foreground">/lifetime</span>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							<ul className="space-y-3">
								<li className="flex items-center gap-3">
									<Star className="w-5 h-5 text-green-500 flex-shrink-0" />
									<span>$200 credits included</span>
								</li>
								<li className="flex items-center gap-3">
									<Star className="w-5 h-5 text-green-500 flex-shrink-0" />
									<span>24 months of Pro access</span>
								</li>
								<li className="flex items-center gap-3">
									<Star className="w-5 h-5 text-green-500 flex-shrink-0" />
									<span>Founder badge and recognition</span>
								</li>
								<li className="flex items-center gap-3">
									<Star className="w-5 h-5 text-green-500 flex-shrink-0" />
									<span>Early access to new features</span>
								</li>
								<li className="flex items-center gap-3">
									<Star className="w-5 h-5 text-green-500 flex-shrink-0" />
									<span>Direct feedback channel</span>
								</li>
							</ul>
							<Button
								onClick={() => handleSubscribe('founder')}
								variant="secondary"
								size="lg"
								className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
							>
								<Crown className="w-4 h-4 mr-2" />
								Get Founder Package
							</Button>
						</CardContent>
					</Card>
				</div>

				<div className="text-center text-sm text-muted-foreground">
					<p>All plans include access to our AI capabilities and platform features.</p>
					<p>Credits are used for AI operations and can be topped up as needed.</p>
				</div>
			</div>
		</div>
	);
}

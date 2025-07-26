import { useAuthActions } from '@convex-dev/auth/react';
import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { MessageCircle } from 'lucide-react';
import { FaqSection, FounderCard, ProCard } from '~/components/subscribe';
import { Button } from '~/components/ui/button';

export const Route = createFileRoute('/pricing')({
	component: PricingPage,
});

function PricingPage() {
	//
	const { signIn } = useAuthActions();

	const handleGetStarted = async (product: 'pro' | 'founder') => {
		track('tap_get_started_pricing', { product });
		signIn('google', { redirectTo: '/subscribe' });
	};

	const handleAskQuestion = () => {
		track('tap_ask_question_pricing');
		signIn('google', { redirectTo: '/subscribe' });
	};

	const questionButton = (
		<Button variant="secondary" size="sm" onClick={handleAskQuestion}>
			<MessageCircle className="w-4 h-4 mr-2" />
			Ask a question
		</Button>
	);

	return (
		<div className="flex flex-col gap-8 my-6 h-full p-4">
			<div className="text-center space-y-4">
				<h1 className="text-4xl font-bold tracking-tight">Pricing</h1>
			</div>

			<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
				<ProCard onSubscribe={handleGetStarted} />
				<FounderCard onSubscribe={handleGetStarted} />
			</div>

			<FaqSection questionComponent={questionButton} />

			<div className="text-center text-sm text-muted-foreground pb-4">
				<p>
					This is a <strong>research preview</strong>. Expect issues.
				</p>
				<p>© 2025 isPro. All rights reserved.</p>
			</div>
		</div>
	);
}

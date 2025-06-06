import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { useAction } from 'convex/react';
import { Crown, Sparkles, Star, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { QuestionDialog } from '~/components/ui/QuestionDialog';
import { useIsPro } from '~/hooks/useIsPro';
import { cn } from '~/lib/utils';

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

function ProCard({ onSubscribe }: { onSubscribe: (product: 'pro' | 'founder') => Promise<void> }) {
	//
	return (
		<Card className="relative border-2 hover:border-primary/50 transition-colors flex flex-col h-full">
			<CardHeader className="text-center pb-8">
				<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
					<Zap className="w-8 h-8 text-primary" />
				</div>
				<CardTitle className="text-2xl">Go Pro</CardTitle>
				<CardDescription className="text-base">
					Monthly subscription with <span className="font-semibold">credits included</span>.
				</CardDescription>
				<div className="text-4xl font-bold mt-4">
					$20
					<span className="text-lg font-normal text-muted-foreground">/month</span>
				</div>
			</CardHeader>
			<CardContent className="space-y-6 content-end flex-grow">
				<ul className="space-y-3">
					<FeatureItem text="$10 worth of credits, every month" icon={Star} />
					<FeatureItem text="Unlimited platform usage" icon={Star} />
					<FeatureItem text="100GB of file storage" icon={Star} />
					<FeatureItem text="Access to Pro-managed skills & loops" icon={Star} />
					<FeatureItem text="Direct channel with developers and founders" icon={Star} />
				</ul>
			</CardContent>
			<CardFooter>
				<Button onClick={() => onSubscribe('pro')} variant="default" size="lg" className="w-full">
					<Sparkles className="w-4 h-4 mr-2" />
					Subscribe to Pro
				</Button>
			</CardFooter>
		</Card>
	);
}

function FounderCard({ onSubscribe }: { onSubscribe: (product: 'pro' | 'founder') => Promise<void> }) {
	//
	return (
		<Card className="relative border-2 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 transition-colors flex flex-col h-full">
			<CardHeader className="text-center pb-8">
				<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
					<Crown className="w-8 h-8 text-green-600 dark:text-green-400" />
				</div>
				<CardTitle className="text-2xl">Founder Package</CardTitle>
				<CardDescription className="text-base">One-time payment to support our research.</CardDescription>
				<div className="text-4xl font-bold mt-4">$500</div>
				<span className="text-lg font-normal text-muted-foreground">(limited to 1000 founders)</span>
			</CardHeader>
			<CardContent className="space-y-6 content-end flex-grow">
				<ul className="space-y-3">
					<FeatureItem text="24 months of Pro subscription ($240)" icon={Star} />
					<FeatureItem text="$200 worth of credits, immediately" icon={Star} />
					<FeatureItem text="Exclusive [founder] badge" icon={Star} />
					<FeatureItem text="Early access to new features, forever" icon={Star} />
					<FeatureItem text="Directly support our open research" icon={Star} />
				</ul>
			</CardContent>
			<CardFooter>
				<Button
					onClick={() => onSubscribe('founder')}
					variant="secondary"
					size="lg"
					className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
				>
					<Crown className="w-4 h-4 mr-2" />
					Become a Founder
				</Button>
			</CardFooter>
		</Card>
	);
}

function FaqSection() {
	//
	const faqs = [
		{
			question: 'What are credits and how do they work?',
			answer: 'Credits are used to power AI operations within Meseeks. Each AI request consumes a certain amount of credits based on the complexity and type of operation. Pro subscribers get $10 worth of credits monthly, while Founder package includes $200 credits upfront.',
		},
		{
			question: 'Can I cancel my Pro subscription anytime?',
			answer: "Yes, you can cancel your Pro subscription at any time. Your access will continue until the end of your current billing period, and you'll retain any unused credits.",
		},
		{
			question: 'What happens to my credits if I cancel?',
			answer: "Any unused credits will remain in your account and can still be used even after cancellation. However, you won't receive new monthly credits unless you resubscribe.",
		},
		{
			question: 'How does the Founder Package work?',
			answer: "The Founder Package is a one-time payment that gives you 24 months of Pro access plus $200 in credits. It's designed for early supporters who want long-term access at a discounted rate.",
		},
		{
			question: 'Can I upgrade or change my plan later?',
			answer: 'Yes, you can upgrade from Pro to Founder Package at any time. The remaining value from your Pro subscription will be credited towards the Founder Package price.',
		},
		{
			question: 'Is there a free tier available?',
			answer: 'Currently, Meseeks requires a subscription to access AI capabilities. However, we occasionally offer free trial periods for new users to experience the platform.',
		},
	];

	return (
		<div className="w-full max-w-3xl mx-auto space-y-4 mt-2">
			<div className="text-center mb-6">
				<h2 className="text-2xl font-bold tracking-tight mb-2">Frequently Asked Questions</h2>
			</div>

			<Accordion type="multiple" className="w-full">
				{faqs.map((faq, index) => (
					<AccordionItem key={index} value={`item-${index}`} className="border rounded-lg mb-2 px-4">
						<AccordionTrigger className="text-left hover:no-underline">{faq.question}</AccordionTrigger>
						<AccordionContent>
							<p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>

			<div className="text-center flex flex-col items-center gap-1 pt-4">
				<p className="text-muted-foreground">Still have questions? We're here to help!</p>
				<QuestionDialog />
			</div>
		</div>
	);
}

function FeatureItem({
	text, //
	icon: Icon,
	className,
}: {
	text: string;
	icon: React.ComponentType<{ className?: string }>;
	className?: string;
}) {
	return (
		<li className={cn('flex items-center gap-3', className)}>
			<Icon className="w-5 h-5 text-green-500 flex-shrink-0" />
			<span>{text}</span>
		</li>
	);
}

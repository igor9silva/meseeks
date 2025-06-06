import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { useAction } from 'convex/react';
import {
	BadgeCheck,
	Crown,
	Database,
	DollarSign,
	Heart,
	Infinity,
	MessageCircle,
	Sparkles,
	Star,
	Zap,
} from 'lucide-react';
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
			</CardHeader>
			<div className="flex-grow flex flex-col justify-center px-6 pb-4">
				<div className="text-center">
					<div className="text-4xl font-bold">
						$20
						<span className="text-lg font-normal text-muted-foreground">/month</span>
					</div>
				</div>
			</div>
			<CardContent className="space-y-6">
				<ul className="space-y-3">
					<FeatureItem text="$10 worth of credits, every month" icon={DollarSign} />
					<FeatureItem text="Unlimited platform usage" icon={Infinity} />
					<FeatureItem text="100GB of file storage" icon={Database} />
					<FeatureItem text="Access to Pro-managed skills & loops" icon={Sparkles} />
					<FeatureItem text="Direct channel with developers and founders" icon={MessageCircle} />
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
			</CardHeader>
			<div className="flex-grow flex flex-col justify-center px-6 pb-4">
				<div className="text-center">
					<div className="text-4xl font-bold">$500</div>
					<span className="text-lg font-normal text-muted-foreground">(limited to 500 founders)</span>
				</div>
			</div>
			<CardContent className="space-y-6 content-end flex-grow">
				<ul className="space-y-3">
					<FeatureItem text="24 months of Pro subscription ($240)" icon={Star} />
					<FeatureItem text="$200 worth of credits, immediately" icon={DollarSign} />
					<FeatureItem text="Exclusive [founder] badge" icon={BadgeCheck} />
					<FeatureItem text="Early access to new features, forever" icon={Zap} />
					<FeatureItem text="Directly support our open research" icon={Heart} />
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
			question: 'What are credits and how does topping up work?',
			answer: 'Credits power AI operations within Meseeks. Pro subscribers get $10 monthly credits that never expire. You can top up additional credits at cost with zero margin from us - $10 gets you exactly $10 worth of credits.',
		},
		{
			question: 'What does "unlimited platform access" include?',
			answer: 'Full access to all Meseeks features: tasks, actions, compositions, speech-to-text, 100GB storage, and Pro-managed skills & loops. No feature restrictions or usage limits.',
		},
		{
			question: 'Can I cancel my Pro subscription anytime?',
			answer: 'Yes, cancel anytime. Your access continues until the current billing period ends, and you keep all unused credits since they never expire.',
		},
		{
			question: 'How does the Founder Package work?',
			answer: 'One-time $500 payment for 24 months of Pro access (worth $480) plus $200 upfront credits. You get an on-chain founder badge, priority experimental features forever, and direct access to developers. Limited to 1000 founders total.',
		},
		{
			question: 'What are skills and loops?',
			answer: 'Skills are specialized AI capabilities that extend Meseeks functionality. Loops are automated workflows. Pro users get access to professionally managed versions maintained by our team.',
		},
		{
			question: 'Is there a free alternative?',
			answer: 'Meseeks is 100% open-source - you can self-host for free forever. Your data stays yours, and you can leave anytime taking every byte with you (and come back hassle-free 😁).',
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

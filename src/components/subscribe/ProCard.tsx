import { Database, DollarSign, Infinity, MessageCircle, Sparkles, Zap } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { FeatureItem } from './FeatureItem';

export function ProCard({ onSubscribe }: { onSubscribe: (product: 'pro' | 'founder') => Promise<void> }) {
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

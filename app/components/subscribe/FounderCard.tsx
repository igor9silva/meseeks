import { BadgeCheck, Crown, DollarSign, Heart, Star, Zap } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { FeatureItem } from './FeatureItem';

export function FounderCard({ onSubscribe }: { onSubscribe: (product: 'pro' | 'founder') => Promise<void> }) {
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

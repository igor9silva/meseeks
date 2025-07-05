import { Link } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { TopUpCard } from '~/components/TopUpCard';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';

interface TopUpSectionProps {
	isPro: boolean;
}

export function TopUpSection({ isPro }: TopUpSectionProps) {
	//
	if (!isPro) {
		return (
			<Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
				<CardContent className="flex items-center gap-3 p-4">
					<AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
					<div className="text-blue-800 dark:text-blue-200 flex items-center justify-between w-full">
						<div>
							You must be a <strong>Pro</strong> user to top up your account balance.
						</div>
						<Link to="/subscribe">
							<Button className="ml-4">Go Pro</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-2">
			<h2 className="text-lg font-semibold">Top Up</h2>
			<TopUpCard />
		</div>
	);
}

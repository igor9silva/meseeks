import { Doc } from 'convex/_generated/dataModel';
import { AlertTriangle } from 'lucide-react';
import { TopUpCard } from '~/components/TopUpCard';
import { Card, CardContent } from '@pro/ui/card';

interface TopUpSectionProps {
	isPro: boolean;
	user: Doc<'users'>;
}

export function TopUpSection({ isPro, user }: TopUpSectionProps) {
	//
	if (!isPro) {
		return (
			<Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
				<CardContent className="flex items-center gap-3 p-4">
					<AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
					<div className="text-blue-800 dark:text-blue-200">
						You must be a <strong>Pro</strong> user to top up your account balance.
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-5">
			<a
				href="https://polar.sh/ispro/portal"
				target="_blank"
				rel="noopener"
				className="text-sm underline underline-offset-2"
			>
				Manage subscription for {user.email ?? user.name ?? user._id}
			</a>
			<div className="space-y-2">
				<h2 className="text-lg font-semibold">Top Up</h2>
				<TopUpCard />
			</div>
		</div>
	);
}

import { Link } from '@tanstack/react-router';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@reactor/ui/card';

export function SkillLearningInfoBox({ query }: { query: string }) {
	//
	return (
		<Card className="text-sm border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 my-4 w-fit">
			<CardContent className="flex items-center gap-3 p-4">
				<Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
				<div className="text-blue-800 dark:text-blue-200 flex items-center justify-between">
					<div className="flex-1">
						<span className="font-medium">Tip: </span>
						Instead of filling everything manually, you can{' '}
						<Link to="/$" params={{ _splat: 'new' }} search={{ q: query }} className="underline">
							just ask Meseeks
						</Link>
						. Tell it what you want and let it shine.
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

import { asBigInt } from 'lib/money';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@pro/ui/card';

interface LowBalanceWarningProps {
	balance: bigint;
}

export function LowBalanceWarning({ balance }: LowBalanceWarningProps) {
	//
	const MIN_SAFE_BALANCE = asBigInt({ dollars: 2 });

	if (balance >= MIN_SAFE_BALANCE) return null;

	return (
		<Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
			<CardContent className="flex items-center gap-3 p-4">
				<AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
				<div className="text-orange-800 dark:text-orange-200">
					Your funds are running low. Consider topping up.
				</div>
			</CardContent>
		</Card>
	);
}

import { useNavigate } from '@tanstack/react-router';
import { asDollars } from 'lib/money';
import { Button } from '@pro/ui/button';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { cn } from '@pro/ui/lib/utils';

export function Balance({ className }: { className?: string }) {
	//
	const user = useCurrentUser();
	const navigate = useNavigate();

	return (
		<Button
			className={cn('p-2 [&_svg]:size-5 gap-1', className)}
			variant="ghost"
			size="lg"
			onClick={() => navigate({ to: '/wallet' })}
		>
			<span className="mt-0.5">⚡</span>
			<span className="hidden md:block">{asDollars({ bigInt: user.spendableBalanceUSD })}</span>
		</Button>
	);
}

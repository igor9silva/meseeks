import { Link } from '@tanstack/react-router';
import { asDollars } from 'lib/money';
import { Button } from '@reactor/ui/button';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { cn } from '@reactor/ui/lib/utils';

export function Balance({ className }: { className?: string }) {
	//
	const user = useCurrentUser();

	return (
		<Button asChild className={cn('p-2 [&_svg]:size-5 gap-1', className)} variant="ghost" size="lg">
			<Link to="/wallet">
				<span className="mt-0.5">⚡</span>
				<span className="hidden md:block">{asDollars({ bigInt: user.balanceUSD ?? 0n })}</span>
			</Link>
		</Button>
	);
}

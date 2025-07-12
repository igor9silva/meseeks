import { useNavigate } from '@tanstack/react-router';
import { asDollars } from 'convex/lib/money';
import { Button } from '~/components/ui/button';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { cn } from '~/lib/utils';

export function Balance({ className }: { className?: string }) {
	//
	const user = useCurrentUser();
	const navigate = useNavigate();

	return (
		<Button
			className={cn('p-2 [&_svg]:size-5 gap-1', className)}
			variant="ghost"
			size="lg"
			onClick={() => navigate({ to: '/balance' })}
		>
			{/* <Wallet /> */}
			<span className="mt-0.5">⚡</span>
			<span className="hidden md:block">{asDollars({ bigInt: user.balanceUSD ?? 0n })}</span>
		</Button>
	);
}

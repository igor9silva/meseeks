import { useNavigate } from '@tanstack/react-router';
import { asDollars } from 'convex/lib/money';
import { Wallet } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { cn } from '~/lib/utils';

export function Balance({ className }: { className?: string }) {
	//
	const user = useCurrentUser();
	const navigate = useNavigate();

	return (
		<Button
			className={cn('hidden md:flex p-2 [&_svg]:size-5', className)}
			variant="ghost"
			size="lg"
			onClick={() => navigate({ to: '/balance' })}
		>
			<Wallet />
			{asDollars({ bigInt: user.balanceUSD ?? 0n })}
		</Button>
	);
}

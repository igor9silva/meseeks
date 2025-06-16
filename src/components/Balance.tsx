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
		<Button className={cn('p-2', className)} variant="ghost" onClick={() => navigate({ to: '/balance' })}>
			<Wallet className="size-3" />
			{asDollars({ bigInt: user.balanceUSD ?? 0n })}
		</Button>
	);
}

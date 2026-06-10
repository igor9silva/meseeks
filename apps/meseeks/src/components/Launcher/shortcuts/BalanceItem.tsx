import { Wallet } from 'lucide-react';
import { CommandItem } from '@pro/ui/command';

export function BalanceItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem
			value="/wallet"
			keywords={['wallet', 'balance', 'top', 'up', 'top-up', 'transactions', 'expenses', 'energy', 'account']}
			onSelect={onSelect}
		>
			<Wallet className="mr-2" />
			Wallet & identity
		</CommandItem>
	);
}

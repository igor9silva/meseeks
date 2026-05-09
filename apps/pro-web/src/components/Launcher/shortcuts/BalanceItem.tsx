import { Wallet } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function BalanceItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem
			value="/balance"
			keywords={['balance', 'top', 'up', 'top-up', 'transactions', 'expenses', 'energy', 'account']}
			onSelect={onSelect}
		>
			<Wallet className="mr-2" />
			Balance & account
		</CommandItem>
	);
}

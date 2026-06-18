import { Wallet } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function BalanceItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem
			value="/wallet"
			keywords={['wallet', 'top', 'up', 'top-up', 'energy', 'account']}
			onSelect={onSelect}
		>
			<Wallet className="mr-2" />
			Wallet
		</CommandItem>
	);
}

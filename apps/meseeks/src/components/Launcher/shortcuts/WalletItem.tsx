import { Wallet } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function WalletItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem
			value="/wallet"
			keywords={['wallet', 'top', 'up', 'top-up', 'transactions', 'expenses', 'account']}
			onSelect={onSelect}
		>
			<Wallet className="mr-2" />
			Wallet
		</CommandItem>
	);
}

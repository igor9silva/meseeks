import { Wallet } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function WalletItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem
			value="/wallet"
			keywords={[
				'wallet',
				'identity',
				'secrets',
				'balance',
				'top',
				'up',
				'top-up',
				'transactions',
				'expenses',
				'energy',
				'account',
			]}
			onSelect={onSelect}
		>
			<Wallet className="mr-2" />
			Wallet & Identity
		</CommandItem>
	);
}

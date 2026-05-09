import { CreditCard } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';
import { useIsPro } from '~/hooks/useIsPro';

export function SubscribeItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	const { isPro } = useIsPro();
	if (isPro) return null;

	return (
		<CommandItem
			value="/subscribe"
			keywords={['subscribe', 'pro', 'upgrade', 'premium', 'plan', 'go pro']}
			onSelect={onSelect}
		>
			<CreditCard className="mr-2" />
			Go Pro (subscribe)
		</CommandItem>
	);
}

import { Inbox } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function InboxItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem value="/inbox" keywords={['inbox', 'index', 'home']} onSelect={onSelect}>
			<Inbox className="mr-2" />
			Go to Inbox
		</CommandItem>
	);
}

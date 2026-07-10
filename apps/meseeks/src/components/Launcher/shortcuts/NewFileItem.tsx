import { SquarePen } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function NewFileItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem value="/new" keywords={['new', 'file']} onSelect={onSelect}>
			<SquarePen className="mr-2" />
			New file
		</CommandItem>
	);
}

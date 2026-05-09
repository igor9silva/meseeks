import { SquarePen } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function NewTaskItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem value="/new" keywords={['new', 'task']} onSelect={onSelect}>
			<SquarePen className="mr-2" />
			New task
		</CommandItem>
	);
}

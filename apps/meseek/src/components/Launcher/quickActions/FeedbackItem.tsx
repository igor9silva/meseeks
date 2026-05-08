import { NotebookPen } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function FeedbackItem({ onSelect }: { onSelect: () => void }) {
	//
	return (
		<CommandItem value="feedback" keywords={['feedback', 'report', 'bug', 'suggest', 'give']} onSelect={onSelect}>
			<NotebookPen className="mr-2" />
			Give feedback
		</CommandItem>
	);
}

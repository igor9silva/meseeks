import { Sparkles } from 'lucide-react';
import { CommandItem } from '@pro/ui/command';

export function SkillsItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem value="/skills" keywords={['skills', 'manage']} onSelect={onSelect}>
			<Sparkles className="mr-2" />
			Manage skills
		</CommandItem>
	);
}

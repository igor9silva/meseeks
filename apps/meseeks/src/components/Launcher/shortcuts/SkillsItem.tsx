import { Sparkles } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function SkillsItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem value="/.pro/skills" keywords={['skills', 'manage']} onSelect={onSelect}>
			<Sparkles className="mr-2" />
			Manage skills
		</CommandItem>
	);
}

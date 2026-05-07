import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@reactor/ui/command';
import { usePreferences } from '~/hooks/usePreferences';

interface SkillCommandListProps {
	//
	onSkillSelect: (skillKey: string) => void;
	excludeSkills?: string[];
	placeholder?: string;
}

export function SkillCommandList({
	onSkillSelect,
	excludeSkills = [],
	placeholder = 'Search skills...',
}: SkillCommandListProps) {
	//
	const { getEnabledSkills } = usePreferences();
	const enabledSkills = getEnabledSkills();
	const availableSkills = enabledSkills.filter((skillKey) => !excludeSkills.includes(skillKey));

	return (
		<Command>
			<CommandInput placeholder={placeholder} autoFocus />
			<CommandList className="max-h-72">
				<CommandEmpty>No enabled skills found.</CommandEmpty>
				<CommandGroup>
					{availableSkills.map((skillKey) => (
						<CommandItem
							key={skillKey}
							value={skillKey}
							onSelect={onSkillSelect}
							className="flex flex-col items-start gap-0.5"
						>
							<span className="font-medium">{skillKey}</span>
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@reactor/ui/command';
import { useEnabledSkillsPreference } from '~/hooks/preferences';

interface SkillCommandListProps {
	//
	onSkillSelect: (skillKey: string) => void;
	excludeSkills?: string[];
	placeholder?: string;
	listId?: string;
}

export function SkillCommandList({
	onSkillSelect,
	excludeSkills = [],
	placeholder = 'Search skills...',
	listId,
}: SkillCommandListProps) {
	//
	const { enabledSkills } = useEnabledSkillsPreference();
	const availableSkills = enabledSkills.filter((skillKey) => !excludeSkills.includes(skillKey));

	return (
		<Command>
			{/* oxlint-disable-next-line jsx-a11y/no-autofocus -- so far better than introducing an useEffect() */}
			<CommandInput placeholder={placeholder} autoFocus />
			<CommandList id={listId} className="max-h-72">
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

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@reactor/ui/command';
import { usePersonalSkills, usePublicSkills } from '~/hooks/query/useSkills';

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
	const { skills: personalSkills } = usePersonalSkills();
	const { skills: publicSkills } = usePublicSkills();
	const availableSkills = publicSkills
		.concat(personalSkills)
		.map((skill) => skill.key)
		.filter((skillKey) => !excludeSkills.includes(skillKey));

	return (
		<Command>
			{/* oxlint-disable-next-line jsx-a11y/no-autofocus -- so far better than introducing an useEffect() */}
			<CommandInput placeholder={placeholder} autoFocus />
			<CommandList id={listId} className="max-h-72">
				<CommandEmpty>No skills found.</CommandEmpty>
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

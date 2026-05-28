import { Link } from '@tanstack/react-router';
import { Doc } from 'convex/_generated/dataModel';
import { usePersonalSkills, usePublicSkills } from '~/hooks/query/useSkills';
import { useEnabledSkillsPreference } from '~/hooks/preferences';
import { SkillCard } from './SkillCard';

type SkillListContentProps = {
	filter: 'personal' | 'public';
	searchTerm: string;
	onShareSkill?: (skill: Doc<'skills'>) => void;
};

/**
 * Fetches and displays the filtered list of skills
 * Should be wrapped in Suspense
 */
export function SkillListContent(props: SkillListContentProps) {
	//
	if (props.filter === 'personal') {
		return <PersonalSkillListContent {...props} />;
	} else {
		return <PublicSkillListContent {...props} />;
	}
}

function PersonalSkillListContent(props: SkillListContentProps) {
	//
	const { skills } = usePersonalSkills();

	return <SkillList {...props} skills={skills} />;
}

function PublicSkillListContent(props: SkillListContentProps) {
	//
	const { skills } = usePublicSkills();

	return <SkillList {...props} skills={skills} />;
}

function SkillList({
	skills,
	searchTerm,
	onShareSkill,
}: SkillListContentProps & {
	skills: Doc<'skills'>[];
}) {
	//
	const { enabledSkills, setEnabledSkills } = useEnabledSkillsPreference();

	const onToggle = (skillKey: string, isEnabled: boolean) => {
		//
		let nextEnabledSkills = enabledSkills;

		if (isEnabled && !enabledSkills.includes(skillKey)) {
			nextEnabledSkills = enabledSkills.concat(skillKey);
		}

		if (!isEnabled && enabledSkills.includes(skillKey)) {
			nextEnabledSkills = enabledSkills.filter((enabledSkill) => enabledSkill !== skillKey);
		}

		setEnabledSkills(nextEnabledSkills);
	};

	// Filter skills based on search term
	const filteredSkills = skills.filter(
		(skill) =>
			skill.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
			skill.description.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	// Empty state
	if (filteredSkills.length === 0) {
		return (
			<div className="text-center py-6">
				{searchTerm.length > 0 ? (
					<p className="text-muted-foreground">No skills found for "{searchTerm}"</p>
				) : (
					<p className="text-muted-foreground">
						No personal skills yet. Start by{' '}
						<Link className="underline" to="/skills/new">
							teaching it a new skill
						</Link>
						.
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{filteredSkills.map((skill) => (
				<SkillCard
					key={skill._id}
					skill={skill}
					isEnabled={enabledSkills.includes(skill.key)}
					onToggle={(isEnabled) => onToggle(skill.key, isEnabled)}
					onShareSkill={onShareSkill}
				/>
			))}
		</div>
	);
}

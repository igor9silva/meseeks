import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { Doc } from 'convex/_generated/dataModel';
import { skillSchema } from 'convex/schemas/skillSchema';
import { useCallback } from 'react';
import { z } from 'zod';
import { usePreferences } from '~/hooks/usePreferences';
import { SkillCard } from './SkillCard';

/**
 * Fetches and displays the filtered list of skills
 * Should be wrapped in Suspense
 */
export function SkillListContent({
	filter, //
	searchTerm,
	onShareSkill,
}: {
	filter: 'personal' | 'public';
	searchTerm: string;
	onShareSkill?: (skill: Doc<'skills'>) => void;
}) {
	//
	const query = convexQuery(api.skills.public[filter === 'personal' ? 'findAllPersonal' : 'findAllPublic'], {});
	const { data: skills } = useSuspenseQuery(query);

	const { getEnabledSkills, setEnabledSkills } = usePreferences();

	const enabledSkills = getEnabledSkills();
	const onToggle = useCallback(
		(skillKey: string, isEnabled: boolean) => {
			//
			if (isEnabled && !enabledSkills.includes(skillKey)) {
				enabledSkills.push(skillKey);
			} else if (!isEnabled && enabledSkills.includes(skillKey)) {
				enabledSkills.splice(enabledSkills.indexOf(skillKey), 1);
			}

			setEnabledSkills(enabledSkills);
		},
		[setEnabledSkills],
	);

	// Filter skills based on search term
	const filteredSkills = skills?.filter(
		(skill: z.infer<typeof skillSchema>) =>
			skill.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
			skill.description.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	// Empty state
	if (filteredSkills?.length === 0) {
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
			{filteredSkills?.map((skill) => (
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

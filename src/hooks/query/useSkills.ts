import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

export function usePersonalSkills() {
	//
	const query = convexQuery(api.skills.public.findAllPersonal, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		skills: result.data,
	};
}

export function usePublicSkills() {
	//
	const query = convexQuery(api.skills.public.findAllPublic, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		skills: result.data,
	};
}

export function useSkill(skillId: Id<'skills'>) {
	//
	const query = convexQuery(api.skills.public.findOne, { skillId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		skill: result.data,
	};
}

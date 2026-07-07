import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';

const byPriority = (a: { priority?: number }, b: { priority?: number }) => {
	return (a.priority ?? 999999999) - (b.priority ?? 999999999);
};

export function usePersonalSkills() {
	//
	const query = convexQuery(api.skills.findAllPersonal, {});
	const result = useSuspenseQuery(query);

	result.data = result.data?.filter((skill) => !skill.isHidden).sort(byPriority);

	return {
		...result,
		skills: result.data,
	};
}

export function usePublicSkills() {
	//
	const query = convexQuery(api.skills.findAllPublic, {});
	const result = useSuspenseQuery(query);

	result.data = result.data?.filter((skill) => !skill.isHidden).sort(byPriority);

	return {
		...result,
		skills: result.data,
	};
}

export function useRootSkills(root: Id<'files'>) {
	//
	const query = convexQuery(api.skills.findByRoot, { root });
	const result = useSuspenseQuery(query);

	result.data = result.data?.filter((skill) => !skill.isHidden).sort(byPriority);

	return {
		...result,
		skills: result.data,
	};
}

export function useSkill(skillId: Id<'skills'>) {
	//
	const query = convexQuery(api.skills.findOne, { skillId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		skill: result.data,
	};
}

export function useInstinct(skillKey: string) {
	//
	const query = convexQuery(api.skills.findOneInstinct, { skillKey });
	const result = useSuspenseQuery(query);

	return {
		...result,
		skill: result.data,
	};
}

export function useInstincts() {
	//
	const query = convexQuery(api.skills.findAllInstincts, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		skills: result.data,
	};
}

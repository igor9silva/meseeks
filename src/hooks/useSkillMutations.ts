import { api } from 'convex/_generated/api';
import { useMutation } from 'convex/react';
import { newSkillSchema } from 'convex/schemas/skillSchema';
import { z } from 'zod';

export function useSkillMutations() {
	//
	const createSkillMutation = useMutation(api.skills.public.create);
	const updateSkillMutation = useMutation(api.skills.public.update);

	const createSkill = (skill: z.infer<typeof newSkillSchema>) => {
		return createSkillMutation({ skill });
	};

	const updateSkill = (skill: z.infer<typeof newSkillSchema>) => {
		return updateSkillMutation({ skill });
	};

	return {
		createSkill,
		updateSkill,
	};
}

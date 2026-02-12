import { useMutation } from 'convex/react';
import { newSkillSchema } from 'schemas/skillSchema';
import { z } from 'zod';
import { api } from 'convex/_generated/api';

export function useSkillMutations() {
	//
	const createSkillMutation = useMutation(api.skills.create);
	const updateSkillMutation = useMutation(api.skills.update);

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

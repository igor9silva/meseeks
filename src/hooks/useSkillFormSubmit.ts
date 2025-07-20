import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Doc } from 'convex/_generated/dataModel';
import { newSkillSchema } from 'convex/schemas/skillSchema';
import { toast } from 'sonner';
import { z } from 'zod';
import { useSkillMutations } from './useSkillMutations';

export function useSkillFormSubmit<T>(
	skill: Doc<'skills'> | undefined,
	buildFunction: (data: T) => z.infer<typeof newSkillSchema>,
) {
	//
	const navigate = useNavigate();
	const { createSkill, updateSkill } = useSkillMutations();

	const { mutate, isPending: isSubmitting } = useMutation({
		mutationFn: async (data: T) => {
			//
			const skillData = buildFunction(data);

			if (skill) {
				await updateSkill(skillData);
				return { action: 'updated', skillData };
			} else {
				await createSkill(skillData);
				return { action: 'created', skillData };
			}
		},
		onSuccess: ({ action }) => {
			//
			const message = `Skill ${action === 'updated' ? 'updated' : 'created'}`;
			toast.success(message);

			// Navigate back to skills list
			navigate({ to: '/skills' });
		},
		onError: (error) => {
			//
			console.error('Error saving skill:', error);

			// Don't expose internal error details to the user
			const isUpdateAction = Boolean(skill);
			const userMessage = isUpdateAction
				? 'Failed to update skill. Please try again.'
				: 'Failed to create skill. Please try again.';

			toast.error(userMessage);
		},
	});

	const submitSkill = (data: T) => {
		//
		mutate(data);
	};

	const handleFormError = (errors: any) => {
		//
		console.error('Form validation errors:', errors);
		toast.error('Please check your input and try again');
	};

	return {
		submitSkill,
		handleFormError,
		isSubmitting,
	};
}

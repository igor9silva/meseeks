import { zodResolver } from '@hookform/resolvers/zod';
import { Doc } from 'convex/_generated/dataModel';
import { modelsSchema } from 'convex/schemas/skillSchema';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import SoftSkillConfig from '~/components/skills/SoftSkillConfig';
import { BasicSkillFields } from '~/components/skills/shared/BasicSkillFields';
import { SkillFormActions } from '~/components/skills/shared/SkillFormActions';
import { Form } from '~/components/ui/form';
import { Separator } from '~/components/ui/separator';
import { useSkillFormSubmit } from '~/hooks/useSkillFormSubmit';
import {
	buildSoftSkillFromForm,
	getDefaultSoftSkill,
	softSkillFormSchema,
	SoftSkillFormValues,
} from '~/lib/skill-form-utils';

type IntelligenceKey = z.infer<typeof modelsSchema>;

interface SoftSkillFormProps {
	skill?: Doc<'skills'>;
	isEditable?: boolean;
}

export function SoftSkillForm({ skill, isEditable = true }: SoftSkillFormProps) {
	//
	const form = useForm<SoftSkillFormValues>({
		resolver: zodResolver(softSkillFormSchema),
		defaultValues: getDefaultSoftSkill(skill),
		mode: 'onChange',
	});

	const { submitSkill, handleFormError, isSubmitting } = useSkillFormSubmit(skill, buildSoftSkillFromForm);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(submitSkill, handleFormError)} className="space-y-6">
				{/* Basic skill fields */}
				<BasicSkillFields form={form} isEditable={isEditable} skill={skill} />

				<Separator />

				{/* Soft skill specific configuration */}
				<SoftSkillConfig
					model={form.watch('config.model') as IntelligenceKey}
					onModelChange={(value: IntelligenceKey) => form.setValue('config.model', value as any)}
					temperature={form.watch('config.temperature')}
					onTemperatureChange={(value: number) => form.setValue('config.temperature', value)}
					instructions={form.watch('config.instructions')}
					onInstructionsChange={(value: string) => form.setValue('config.instructions', value)}
					availableSkills={form.watch('config.availableSkills')}
					onAvailableSkillsChange={(skills: string[]) => form.setValue('config.availableSkills', skills)}
					isEditable={isEditable}
				/>

				{/* Form Actions */}
				<SkillFormActions isSubmitting={isSubmitting} isEditable={isEditable} />
			</form>
		</Form>
	);
}

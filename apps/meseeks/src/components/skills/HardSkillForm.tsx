import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Doc } from 'convex/_generated/dataModel';
import { useForm } from 'react-hook-form';
import { HardSkillConfig } from '~/components/skills/HardSkillConfig';
import { BasicSkillFields } from '~/components/skills/shared/BasicSkillFields';
import { SkillFormActions } from '~/components/skills/shared/SkillFormActions';
import { Form } from '@reactor/ui/form';
import { useSkillFormSubmit } from '~/hooks/useSkillFormSubmit';
import {
	buildHardSkillFromForm,
	getDefaultHardSkill,
	hardSkillFormSchema,
	HardSkillFormValues,
} from '~/lib/skill-form-utils';

interface HardSkillFormProps {
	skill?: Doc<'skills'>;
	isEditable?: boolean;
}

export function HardSkillForm({ skill, isEditable = true }: HardSkillFormProps) {
	//
	const form = useForm<HardSkillFormValues>({
		resolver: standardSchemaResolver(hardSkillFormSchema),
		defaultValues: getDefaultHardSkill(skill),
		mode: 'onChange',
	});

	const { submitSkill, handleFormError, isSubmitting } = useSkillFormSubmit(skill, buildHardSkillFromForm);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(submitSkill, handleFormError)} className="space-y-6">
				{/* Basic skill fields */}
				<BasicSkillFields form={form} isEditable={isEditable} skill={skill} />

				{/* Hard skill specific configuration */}
				<HardSkillConfig
					url={form.watch('config.url')}
					onUrlChange={(value) => form.setValue('config.url', value)}
					method={form.watch('config.method')}
					onMethodChange={(value) => form.setValue('config.method', value)}
					headers={form.watch('config.headers')}
					onHeadersChange={(headers) => form.setValue('config.headers', headers)}
					paramMappings={form.watch('config.paramMappings')}
					onParamMappingsChange={(mappings) => form.setValue('config.paramMappings', mappings)}
					bodyTemplate={form.watch('bodyTemplate')}
					onBodyTemplateChange={(value) => form.setValue('bodyTemplate', value)}
					isEditable={isEditable}
				/>

				{/* Form Actions */}
				<SkillFormActions isSubmitting={isSubmitting} isEditable={isEditable} />
			</form>
		</Form>
	);
}

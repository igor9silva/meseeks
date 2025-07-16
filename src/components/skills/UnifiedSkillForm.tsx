import { zodResolver } from '@hookform/resolvers/zod';
import { Doc } from 'convex/_generated/dataModel';
import { asBigInt } from 'convex/lib/money';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { HardSkillConfig } from '~/components/skills/HardSkillConfig';
import { SoftSkillConfig } from '~/components/skills/SoftSkillConfig';
import { Button } from '~/components/ui/button';
import { Form } from '~/components/ui/form';
import { Separator } from '~/components/ui/separator';
import { BasicInfoFields } from './BasicInfoFields';
import { FormActions } from './FormActions';
import { SkillKindSelector } from './SkillKindSelector';

const skillFormSchema = z.object({
	key: z.string().min(1, 'Key is required'),
	description: z.string().min(1, 'Description is required'),
	kind: z.enum(['soft', 'hard']),
	inputSchema: z.string().optional(),
	preApprovedCost: z.union([
		z.literal('none'),
		z
			.bigint()
			.min(asBigInt({ dollars: 0 }), 'Cost must be at least $0')
			.max(asBigInt({ dollars: 1000 }), 'Cost must be less than $1000'),
	]),
	// We'll add more fields based on the skill type later
});

type SkillFormValues = z.infer<typeof skillFormSchema>;

interface UnifiedSkillFormProps {
	skill?: Doc<'skills'>;
	isEditable?: boolean;
}

export function UnifiedSkillForm({ skill, isEditable = true }: UnifiedSkillFormProps) {
	//
	if (skill?.kind === 'built-in') return <div>🚫</div>;

	const form = useForm<SkillFormValues>({
		resolver: zodResolver(skillFormSchema),
		defaultValues: {
			key: skill?.key || '',
			description: skill?.description || '',
			kind: skill?.kind || 'soft',
			inputSchema: skill?.inputSchema || 'z.object({})',
			preApprovedCost: skill?.preApprovedCost || 'none',
		},
		mode: 'onChange',
	});

	const onSubmit = (data: SkillFormValues) => {
		console.log('Form submitted:', data);
		alert('Form submitted');
		// TODO: We'll implement the actual submission logic later
	};

	const onError = (errors: any) => {
		console.error('Form validation errors:', errors);
	};

	const isHardSkill = form.watch('kind') === 'hard';

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
				{/*  */}
				<SkillKindSelector disabled={!isEditable} />

				{/* Basic Info Fields */}
				<BasicInfoFields isHardSkill={isHardSkill} isEditable={isEditable} />

				<Separator />

				{/* Skill-specific configuration */}
				{form.watch('kind') === 'soft' ? <SoftSkillConfig /> : <HardSkillConfig />}

				{/* Form Actions */}
				<FormActions isEditing={Boolean(skill)} />

				<div className="flex justify-end">
					<Button type="submit" disabled={!isEditable}>
						{skill ? 'Save' : 'Learn skill'}
					</Button>
				</div>
			</form>
		</Form>
	);
}

import { Doc } from 'convex/_generated/dataModel';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import { LabelWithTooltip } from '~/components/ui/form-tooltip';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { InputSchemaDisplay } from './InputSchemaDisplay';

interface BasicSkillFieldsProps {
	form: UseFormReturn<any>;
	isEditable: boolean;
	skill?: Doc<'skills'>;
}

export function BasicSkillFields({ form, isEditable, skill }: BasicSkillFieldsProps) {
	//
	const isExistingSkill = Boolean(skill);
	const isKeyEditable = isEditable && !isExistingSkill;

	return (
		<div className="space-y-4">
			{/* Key Field */}
			<FormField
				control={form.control}
				name="key"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Key</FormLabel>
						<FormControl>
							<Input {...field} disabled={!isKeyEditable} placeholder="my-skill-name" />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* Description Field */}
			<FormField
				control={form.control}
				name="skillSet"
				render={({ field }) => (
					<FormItem>
						<LabelWithTooltip tooltip="Optional skill set identifier to group related skills, e.g. twitter. Use lowercase letters, numbers and hyphens only.">
							Skill Set
						</LabelWithTooltip>
						<FormControl>
							<Input
								{...field}
								disabled={!isEditable}
								value={field.value || ''}
								placeholder="twitter"
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* Description Field */}
			<FormField
				control={form.control}
				name="description"
				render={({ field }) => (
					<FormItem>
						<LabelWithTooltip tooltip="This description is exposed to the AI when selecting skills. It should clearly explain what the skill does and when to use it, as the AI uses this information to decide whether to use this skill during task execution.">
							Description
						</LabelWithTooltip>
						<FormControl>
							<Textarea
								{...field}
								disabled={!isEditable}
								placeholder="Describe what this skill does and when to use it..."
								rows={3}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* Input Schema Field */}
			<FormField
				control={form.control}
				name="inputSchema"
				render={({ field }) => (
					<FormItem>
						<LabelWithTooltip tooltip="An OpenAI-compatible JSON Schema that defines the expected input parameters for this skill. This describes what data the skill needs to function properly. You if have no idea what this is, you'll be better served by asking Meseeks to learn it, instead of trying to fill manually.">
							Input Schema
						</LabelWithTooltip>
						<FormControl>
							{isEditable ? (
								<Textarea
									{...field}
									disabled={!isEditable}
									placeholder="{}"
									rows={3}
									className="font-mono"
								/>
							) : (
								<InputSchemaDisplay schema={field.value || '{}'} />
							)}
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}

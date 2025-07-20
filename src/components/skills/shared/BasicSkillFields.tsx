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
				name="description"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Description</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								disabled={!isEditable}
								placeholder="Describe what this skill does..."
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
						<LabelWithTooltip tooltip="An OpenAI-compatible JSON Schema that defines the expected input parameters for this skill. This describes what data the skill needs to function properly.">
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

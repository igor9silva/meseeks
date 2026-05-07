import { Doc } from 'convex/_generated/dataModel';
import { asBigInt, asDollars, asNumber, MONEY_PRECISION } from 'lib/money';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@reactor/ui/form';
import { LabelWithTooltip } from '@reactor/ui/form-tooltip';
import { Input } from '@reactor/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@reactor/ui/select';
import { Textarea } from '@reactor/ui/textarea';
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

			<AuthorizationField form={form} isEditable={isEditable} />

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

function AuthorizationField({ form, isEditable }: Pick<BasicSkillFieldsProps, 'form' | 'isEditable'>) {
	//
	const preApprovedCost = form.watch('preApprovedCost');
	const isPreApproved = preApprovedCost !== 'none';
	const DEFAULT_COST = asBigInt({ dollars: 0.002 });
	const displayValue = typeof preApprovedCost === 'bigint' ? asNumber({ bigInt: preApprovedCost }) : '';

	return (
		<FormField
			control={form.control}
			name="preApprovedCost"
			render={({ field }) => (
				<FormItem>
					<LabelWithTooltip tooltip="Controls when this skill requires human approval. You can allow it to be executed by Meseeks with no human approval (up to a certain cost), but it'll still be subject to other limits, such as maximum amount of consecutive actions.">
						Authorization
					</LabelWithTooltip>
					<div className="flex flex-row items-center gap-3 w-full">
						<div className={!isPreApproved ? 'w-full' : 'w-2/3'}>
							<FormControl>
								<Select
									value={field.value === 'none' ? 'none' : 'auto'}
									onValueChange={(value) => {
										if (value === 'none') {
											field.onChange('none');
											return;
										}

										field.onChange(DEFAULT_COST);
									}}
									disabled={!isEditable}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select authorization type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Always require human authorization</SelectItem>
										<SelectItem value="auto">Perform automatically up to</SelectItem>
									</SelectContent>
								</Select>
							</FormControl>
						</div>

						{isPreApproved && (
							<div className="flex items-center gap-1 w-1/3">
								<FormControl>
									<div className="relative flex-1">
										<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-500">
											$
										</span>
										<Input
											value={displayValue}
											type="number"
											min="0"
											step={1 / MONEY_PRECISION}
											placeholder={asDollars({ bigInt: DEFAULT_COST, precision: 10 })}
											className="pl-6 w-full"
											disabled={!isEditable}
											onChange={(event) => {
												const value = event.target.value;
												if (value.length === 0) {
													field.onChange('');
													return;
												}

												field.onChange(asBigInt({ dollars: Number.parseFloat(value) }));
											}}
										/>
									</div>
								</FormControl>
							</div>
						)}
					</div>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

import { asBigInt, asDollars, asNumber, MONEY_PRECISION } from 'convex/lib/money';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '~/components/ui/form';
import { LabelWithTooltip } from '~/components/ui/form-tooltip';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { InputSchemaDisplay } from './shared/InputSchemaDisplay';

interface BasicInfoFieldsProps {
	isHardSkill?: boolean;
	isEditable?: boolean;
}

export function BasicInfoFields({ isHardSkill = false, isEditable = true }: BasicInfoFieldsProps) {
	//
	return (
		<div className="space-y-4">
			{/* */}
			<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
				<KeyField disabled={!isEditable} />
				<AuthorizationField disabled={!isEditable} />
			</div>

			<DescriptionField disabled={!isEditable} />

			{/* Input Schema is only for hard skills */}
			{isHardSkill && <InputSchemaField disabled={!isEditable} />}
		</div>
	);
}

function KeyField({ disabled }: { disabled?: boolean }) {
	//
	const { control } = useFormContext();

	return (
		<FormField
			control={control}
			name="key"
			render={({ field }) => (
				<FormItem>
					<LabelWithTooltip tooltip="A unique identifier for this skill. e.g. google_search, twitter_post, etc.">
						Key (unique identifier)
					</LabelWithTooltip>
					<FormControl>
						<Input {...field} placeholder="e.g., google_search, twitter_post" disabled={disabled} />
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

function AuthorizationField({ disabled }: { disabled?: boolean }) {
	//
	const { control, watch } = useFormContext();
	const preApprovedCost = watch('preApprovedCost'); // || 'none';
	const isPreApproved = preApprovedCost !== 'none';

	const DEFAULT_COST = asBigInt({ dollars: 0.002 });

	const displayValue = useMemo(() => {
		//
		if (preApprovedCost === 'none') return 'none';

		return asNumber({ bigInt: preApprovedCost });
		//
	}, [preApprovedCost]);

	return (
		<FormField
			control={control}
			name="preApprovedCost"
			render={({ field }) => (
				<FormItem>
					<LabelWithTooltip tooltip="Controls when this skill requires human approval. You can allow it to be executed by Meseeks with no human approval (up to a certain cost), but it'll still be subject to other limits, such as maximum amount of consecutive actions.">
						Authorization
					</LabelWithTooltip>
					<div className="flex flex-row items-center gap-3 w-full">
						<div className={`${!isPreApproved ? 'w-full' : 'w-2/3'}`}>
							<FormControl>
								<Select
									value={field.value === 'none' ? 'none' : 'auto'}
									onValueChange={(value) => {
										if (value === 'none') {
											field.onChange('none');
										} else {
											field.onChange(DEFAULT_COST);
										}
									}}
									disabled={disabled}
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
											disabled={disabled}
											onChange={(e) => {
												const value = e.target.value;
												if (value.length === 0) {
													field.onChange('');
												} else {
													field.onChange(asBigInt({ dollars: parseFloat(value) }));
												}
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

function DescriptionField({ disabled }: { disabled?: boolean }) {
	//
	const { control } = useFormContext();

	return (
		<FormField
			control={control}
			name="description"
			render={({ field }) => (
				<FormItem>
					<LabelWithTooltip tooltip="This description is exposed to the AI when selecting skills. It should clearly explain what the skill does and when to use it, as the AI uses this information to decide whether to use this skill during task execution.">
						Description
					</LabelWithTooltip>
					<FormControl>
						<Textarea
							{...field}
							placeholder="Describe what this skill does and when/how to use it..."
							className="min-h-24"
							disabled={disabled}
						/>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

function InputSchemaField({ disabled }: { disabled?: boolean }) {
	//
	const { control } = useFormContext();

	return (
		<FormField
			control={control}
			name="inputSchema"
			render={({ field }) => (
				<FormItem>
					<LabelWithTooltip tooltip="An OpenAI-compatible JSON Schema that defines the expected input parameters for this skill. This describes what data the skill needs to function properly.">
						Input Schema
					</LabelWithTooltip>
					<FormControl>
						{disabled ? (
							<InputSchemaDisplay schema={field.value || '{}'} />
						) : (
							<Textarea {...field} placeholder="{}" disabled={disabled} className="min-h-40" />
						)}
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

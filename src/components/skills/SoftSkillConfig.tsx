import { DEFAULT_INTELLIGENCE, type IntelligenceKey } from 'convex/schemas/intelligenceSchema';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { IntelligenceSelector } from '~/components/IntelligenceSelector';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { LabelWithTooltip } from '~/components/ui/form-tooltip';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Slider } from '~/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Textarea } from '~/components/ui/textarea';
import { SkillSelector } from './shared/SkillSelector';

type IntelligenceMode = 'automatic' | 'specific';

export interface SoftSkillConfigProps {
	model?: IntelligenceKey | 'auto';
	onModelChange: (value: IntelligenceKey | 'auto') => void;
	temperature?: number;
	onTemperatureChange: (value: number) => void;
	instructions?: string;
	onInstructionsChange: (value: string) => void;
	availableSkills?: string[];
	onAvailableSkillsChange: (skills: string[]) => void;
	isEditable?: boolean;
}

export default function SoftSkillConfig({
	model,
	onModelChange,
	temperature = 0.7,
	onTemperatureChange,
	instructions,
	onInstructionsChange,
	availableSkills = [],
	onAvailableSkillsChange,
	isEditable = true,
}: SoftSkillConfigProps) {
	//
	const [intelligenceMode, setIntelligenceMode] = useState<IntelligenceMode>(
		model === 'auto' || !model ? 'automatic' : 'specific',
	);

	// Update intelligence mode when model changes externally
	useEffect(() => {
		if (model === 'auto' || !model) {
			setIntelligenceMode('automatic');
		} else {
			setIntelligenceMode('specific');
		}
	}, [model]);

	const handleIntelligenceModeChange = (mode: IntelligenceMode) => {
		//
		setIntelligenceMode(mode);
		if (mode === 'automatic') {
			onModelChange('auto');
		} else {
			// If switching to specific but current model is 'auto', use default
			if (model === 'auto' || !model) {
				onModelChange(DEFAULT_INTELLIGENCE); // default
			}
		}
	};

	const handleSpecificModelChange = (value: IntelligenceKey) => {
		//
		onModelChange(value);
	};

	const handleRemoveSkill = (skillToRemove: string) => {
		const updatedSkills = availableSkills.filter((skill) => skill !== skillToRemove);
		onAvailableSkillsChange?.(updatedSkills);
	};

	return (
		<div className="space-y-4">
			<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
				{/* Instructions section remains the same */}
				<div className="space-y-2 col-span-2">
					<LabelWithTooltip
						htmlFor="instructions"
						tooltip="Detailed instructions that will guide the AI model in making decisions and performing tasks."
					>
						Instructions
					</LabelWithTooltip>
					<Textarea
						id="instructions"
						value={instructions}
						onChange={(e) => onInstructionsChange(e.target.value)}
						placeholder="Detailed instructions for the model"
						className="min-h-[200px]"
						required
						disabled={!isEditable}
					/>
				</div>

				<div className="space-y-2 col-span-1">
					<LabelWithTooltip
						htmlFor="model"
						tooltip="Choose whether to use the task's selected intelligence automatically, or specify a particular model for this skill."
					>
						Intelligence
					</LabelWithTooltip>
					<div className="flex items-center gap-2">
						<Tabs
							value={intelligenceMode}
							onValueChange={(value) => handleIntelligenceModeChange(value as IntelligenceMode)}
							className="min-w-fit"
						>
							<TabsList className="grid grid-cols-2 min-w-fit">
								<TabsTrigger value="automatic" disabled={!isEditable} className="px-4">
									From task
								</TabsTrigger>
								<TabsTrigger value="specific" disabled={!isEditable} className="px-4">
									Specific
								</TabsTrigger>
							</TabsList>
						</Tabs>

						{intelligenceMode === 'specific' && isEditable && (
							<IntelligenceSelector
								value={model === 'auto' ? undefined : model}
								onChange={handleSpecificModelChange}
								className="min-w-0"
							/>
						)}
					</div>
				</div>

				<div className="space-y-2 col-span-2 md:col-span-1">
					<LabelWithTooltip
						htmlFor="temperature"
						tooltip="Controls randomness: lower values mean more deterministic, higher values mean more creative. The *higher* it is, the more likely to hallucinate it gets."
					>
						Temperature
					</LabelWithTooltip>
					<div className="flex flex-col space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">Deterministic</span>
							<span className="text-sm font-medium tabular-nums">{temperature.toFixed(2)}</span>
							<span className="text-sm text-muted-foreground">Creative</span>
						</div>
						<Slider
							id="temperature"
							min={0}
							max={2}
							step={0.01}
							value={[temperature]}
							onValueChange={(values) => onTemperatureChange(values[0])}
							className="mt-2"
							disabled={!isEditable}
						/>
					</div>
				</div>
			</div>

			{/* Available Skills section */}
			<div className="space-y-2">
				<LabelWithTooltip
					htmlFor="availableSkills"
					tooltip="Skills that the AI model can choose to use during task execution."
				>
					Available Skills
				</LabelWithTooltip>

				{isEditable && (
					<SkillSelector
						value=""
						onValueChange={(skillKey) => {
							if (skillKey && !availableSkills.includes(skillKey)) {
								onAvailableSkillsChange([...availableSkills, skillKey]);
							}
						}}
						excludeSkills={availableSkills}
						placeholder="Select a skill"
					/>
				)}

				{availableSkills.length > 0 && (
					<div className="mt-2">
						<ScrollArea className="max-h-32 w-full">
							<div className="flex flex-wrap gap-2">
								{availableSkills.map((skill) => (
									<Badge key={skill} variant="secondary" className="flex items-center gap-1">
										{skill}
										{isEditable && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-4 w-4 ml-1 p-0"
												onClick={() => handleRemoveSkill(skill)}
											>
												<X className="h-3 w-3" />
											</Button>
										)}
									</Badge>
								))}
							</div>
						</ScrollArea>
					</div>
				)}
			</div>
		</div>
	);
}

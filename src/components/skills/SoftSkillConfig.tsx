import { modelsSchema } from 'convex/schemas/skillSchema';
import { X } from 'lucide-react';
import { z } from 'zod';
import { IntelligenceSelector } from '~/components/IntelligenceSelector';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { LabelWithTooltip } from '~/components/ui/form-tooltip';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Slider } from '~/components/ui/slider';
import { Textarea } from '~/components/ui/textarea';
import { SkillSelector } from './shared/SkillSelector';

type IntelligenceKey = z.infer<typeof modelsSchema>;

export interface SoftSkillConfigProps {
	model?: IntelligenceKey;
	onModelChange: (value: IntelligenceKey) => void;
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
	const handleRemoveSkill = (skillToRemove: string) => {
		const updatedSkills = availableSkills.filter((skill) => skill !== skillToRemove);
		onAvailableSkillsChange?.(updatedSkills);
	};

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-medium">AI Configuration</h2>

			<div className="space-y-4">
				<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
					<div className="space-y-2">
						<LabelWithTooltip
							htmlFor="model"
							tooltip="The AI model that will power this skill. Different models have different capabilities and costs."
						>
							Intelligence
						</LabelWithTooltip>
						<IntelligenceSelector value={model} onChange={onModelChange} disabled={!isEditable} />
					</div>

					<div className="space-y-2">
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

				<div className="space-y-2">
					<LabelWithTooltip
						htmlFor="instructions"
						tooltip="Detailed instructions for the AI model on how to perform this skill. Be specific and comprehensive."
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

				<div className="space-y-2">
					<LabelWithTooltip
						htmlFor="availableSkills"
						tooltip="Soft skills will always finish with exactly 1 reaction (never 0, never 2). This list is the set of options it has to choose from."
					>
						Available skills
					</LabelWithTooltip>
					<SkillSelector
						value=""
						onValueChange={(skillKey) => {
							if (skillKey && !availableSkills.includes(skillKey)) {
								onAvailableSkillsChange([...availableSkills, skillKey]);
							}
						}}
						excludeSkills={availableSkills}
						placeholder="Select a skill"
						disabled={!isEditable}
					/>

					{availableSkills.length > 0 ? (
						<ScrollArea className="h-32 border rounded-xl p-4">
							<div className="flex flex-wrap gap-2">
								{availableSkills.map((skill) => (
									<Badge key={skill} variant="secondary" className="flex items-center gap-1">
										{skill}
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-4 w-4 ml-1 p-0"
											onClick={() => handleRemoveSkill(skill)}
											disabled={!isEditable}
										>
											<X className="h-3 w-3" />
										</Button>
									</Badge>
								))}
							</div>
						</ScrollArea>
					) : (
						<div className="text-center p-4 border rounded-xl text-muted-foreground">
							No skills connected
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

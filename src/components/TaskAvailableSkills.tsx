import { Plus, X } from 'lucide-react';
import { Suspense, useState } from 'react';
import { SkillCommandList } from '~/components/skills/shared/SkillCommandList';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import { usePreferences } from '~/hooks/usePreferences';

interface TaskAvailableSkillsProps {
	availableSkills: string[];
	onAvailableSkillsChange: (skills: string[]) => void;
}

function TaskAvailableSkillsContent({ availableSkills, onAvailableSkillsChange }: TaskAvailableSkillsProps) {
	//
	const { getEnabledSkills } = usePreferences();
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	// Get enabled skills list
	const enabledSkills = getEnabledSkills();

	const handleAddSkill = (skillKey: string) => {
		//
		if (!skillKey || availableSkills.includes(skillKey)) return;

		onAvailableSkillsChange([...availableSkills, skillKey]);
		setIsPopoverOpen(false);
	};

	const handleRemoveSkill = (skillKey: string) => {
		//
		onAvailableSkillsChange(availableSkills.filter((s) => s !== skillKey));
	};

	const availableSkillsToAdd = enabledSkills.filter((skillKey) => !availableSkills.includes(skillKey));
	const hasSkills = availableSkills.length > 0;
	const canAddMoreSkills = availableSkills.length < 16;
	const hasSkillsToAdd = availableSkillsToAdd.length > 0;
	const hasAnyEnabledSkills = enabledSkills.length > 0;

	const SkillCommandListSkeleton = () => (
		<div className="p-4 space-y-2">
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-6 w-3/4" />
			<Skeleton className="h-6 w-1/2" />
			<Skeleton className="h-6 w-2/3" />
		</div>
	);

	return (
		<div className="px-2 pb-2">
			{hasSkills && (
				<div className="flex flex-wrap gap-1 mb-2">
					{availableSkills.map((skillKey) => (
						<Badge key={skillKey} variant="secondary" className="text-xs flex items-center gap-1">
							{skillKey}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-2 w-2 p-0 hover:bg-destructive/20"
								onClick={() => handleRemoveSkill(skillKey)}
								aria-label={`Remove ${skillKey} skill`}
							>
								<X className="max-w-3 max-h-3" />
							</Button>
						</Badge>
					))}

					{canAddMoreSkills && hasSkillsToAdd && (
						<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
							<PopoverTrigger asChild>
								<Button
									type="button"
									size="icon"
									variant="outline"
									className="h-6 w-6"
									aria-label="Add skill"
								>
									<Plus className="h-3 w-3" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-80 p-0" align="start">
								<Suspense fallback={<SkillCommandListSkeleton />}>
									<SkillCommandList
										onSkillSelect={handleAddSkill}
										excludeSkills={availableSkills}
										placeholder="Search skills..."
									/>
								</Suspense>
							</PopoverContent>
						</Popover>
					)}
				</div>
			)}

			{!hasSkills && canAddMoreSkills && hasSkillsToAdd && (
				<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
					<PopoverTrigger asChild>
						<Button type="button" size="icon" variant="outline" className="h-6 w-6" aria-label="Add skill">
							<Plus className="h-3 w-3" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-80 p-0" align="start">
						<Suspense fallback={<SkillCommandListSkeleton />}>
							<SkillCommandList
								onSkillSelect={handleAddSkill}
								excludeSkills={availableSkills}
								placeholder="Search skills..."
							/>
						</Suspense>
					</PopoverContent>
				</Popover>
			)}

			{!hasSkills && !hasAnyEnabledSkills && (
				<div className="text-xs text-muted-foreground px-2">
					No enabled skills available. Enable skills in the Skills section to add them here.
				</div>
			)}

			{!hasSkills && hasAnyEnabledSkills && !hasSkillsToAdd && (
				<div className="text-xs text-muted-foreground px-2">
					All enabled skills are already added to this task.
				</div>
			)}

			{!hasSkills && hasAnyEnabledSkills && hasSkillsToAdd && (
				<div className="text-xs text-muted-foreground px-2">
					No specific skills configured. Click the + button to add skills and limit which ones are available
					for this task.
				</div>
			)}

			{availableSkills.length >= 16 && (
				<div className="text-xs text-muted-foreground px-2 mt-1">Maximum of 16 skills reached.</div>
			)}
		</div>
	);
}

export function TaskAvailableSkills({ availableSkills, onAvailableSkillsChange }: TaskAvailableSkillsProps) {
	//
	return (
		<Suspense
			fallback={
				<div className="px-2 pb-2">
					<div className="text-xs text-muted-foreground">Loading skills...</div>
				</div>
			}
		>
			<TaskAvailableSkillsContent
				availableSkills={availableSkills}
				onAvailableSkillsChange={onAvailableSkillsChange}
			/>
		</Suspense>
	);
}

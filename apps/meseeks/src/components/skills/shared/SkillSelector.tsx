import { Suspense, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import { SkillCommandList } from './SkillCommandList';

interface SkillSelectorProps {
	//
	value: string;
	onValueChange: (value: string) => void;
	excludeSkills?: string[];
	placeholder?: string;
	disabled?: boolean;
}

export function SkillSelector({
	value,
	onValueChange,
	excludeSkills = [],
	placeholder = 'Select a skill',
	disabled = false,
}: SkillSelectorProps) {
	//
	const [isOpen, setIsOpen] = useState(false);

	const handleSelect = (skillKey: string) => {
		//
		onValueChange(skillKey);
		setIsOpen(false);
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={isOpen}
					className="w-full justify-between"
					disabled={disabled}
				>
					{value || placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="start">
				<Suspense
					fallback={
						<div className="p-4 space-y-2">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-6 w-3/4" />
							<Skeleton className="h-6 w-1/2" />
							<Skeleton className="h-6 w-2/3" />
						</div>
					}
				>
					<SkillCommandList
						onSkillSelect={handleSelect}
						excludeSkills={excludeSkills}
						placeholder="Search skills..."
					/>
				</Suspense>
			</PopoverContent>
		</Popover>
	);
}

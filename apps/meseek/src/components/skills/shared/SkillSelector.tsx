import { Suspense, useId, useState } from 'react';
import { Button } from '@reactor/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@reactor/ui/popover';
import { Skeleton } from '@reactor/ui/skeleton';
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
	const listId = useId();

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
					// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- radix popover uses a button trigger for the combobox; a native input would fight command selection
					role="combobox"
					aria-expanded={isOpen}
					aria-controls={listId}
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
						listId={listId}
						onSkillSelect={handleSelect}
						excludeSkills={excludeSkills}
						placeholder="Search skills..."
					/>
				</Suspense>
			</PopoverContent>
		</Popover>
	);
}

import {
	DEFAULT_INTELLIGENCE,
	RECOMMENDED_INTELLIGENCE_KEYS,
	type DisplayIntelligence,
} from 'schemas/intelligenceSchema';
import { Brain, ChevronsUpDown } from 'lucide-react';
import { forwardRef, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@reactor/ui/button';
import { Command } from '@reactor/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@reactor/ui/popover';
import { Skeleton } from '@reactor/ui/skeleton';
import { useIntelligences } from '~/hooks/query/useIntelligences';
import { cn } from '@reactor/ui/lib/utils';
import { IntelligenceDetailsPanel } from './IntelligenceDetailsPanel';
import { IntelligenceList } from './IntelligenceList';
import type { IntelligencePickerOption, IntelligencePickerResolvedOptions, IntelligencePickerData } from './types';

export interface IntelligencePickerProps {
	value?: string;
	onChange: (value: string) => void;
	options?: IntelligencePickerOption[];
	recommendedKeys?: string[];
	popoverSide?: 'bottom' | 'left' | 'right' | 'top';
	className?: string;
	disabled?: boolean;
}

export const IntelligencePicker = forwardRef<HTMLButtonElement, IntelligencePickerProps>(
	({ value, onChange, options, recommendedKeys, popoverSide, className, disabled = false }, ref) => {
		//
		return (
			<Suspense fallback={<Skeleton className="w-60 h-8" />}>
				<IntelligenceCombobox
					value={value}
					onChange={onChange}
					options={options}
					recommendedKeys={recommendedKeys}
					popoverSide={popoverSide}
					ref={ref}
					className={className}
					disabled={disabled}
				/>
			</Suspense>
		);
	},
);

IntelligencePicker.displayName = 'IntelligencePicker';

const IntelligenceCombobox = forwardRef<HTMLButtonElement, IntelligencePickerProps>(
	({ value, onChange, options, recommendedKeys, popoverSide = 'bottom', className, disabled = false }, ref) => {
		//
		const { intelligences } = useIntelligences();
		const defaultOptions = defaultIntelligencePickerOptions(intelligences);
		const pickerOptions = options ?? defaultOptions.options;
		const pickerRecommendedKeys = recommendedKeys ?? defaultOptions.recommendedKeys;
		const selected = value ?? pickerOptions[0]?.key ?? DEFAULT_INTELLIGENCE;

		const [open, setOpen] = useState(false);
		const [hovered, setHovered] = useState<string | null>(null);
		const previousSelectedRef = useRef(selected);
		const listId = useId();

		const selectedOption = pickerOptions.find(
			(option) => option.key === selected, //
		);

		useEffect(() => {
			if (previousSelectedRef.current === selected) return;

			previousSelectedRef.current = selected;
			setHovered(null);
			setOpen(false);
		}, [selected]);

		const handleSelect = (key: string) => {
			//
			const option = pickerOptions.find((candidate) => candidate.key === key);
			if (!option) {
				console.error('Invalid intelligence key', key);
				return;
			}

			setHovered(null);
			setOpen(false);
			onChange(option.key);
		};

		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						ref={ref}
						variant="outline"
						// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- radix popover uses a button trigger for the combobox; a native input would fight command selection
						role="combobox"
						aria-expanded={open}
						aria-controls={listId}
						disabled={disabled}
						className={cn(
							'w-full justify-between rounded-3xl px-3 py-2 text-sm',
							'flex h-9 items-center shadow-sm ring-offset-background',
							'border border-input bg-transparent focus:outline-none',
							'focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
							'data-[placeholder]:text-muted-foreground',
							className,
						)}
					>
						{selectedOption ? (
							<div className="flex items-center gap-2 truncate">
								<Brain className="h-4 w-4 text-muted-foreground flex-shrink-0" />
								<span className="truncate ">{selectedOption.name}</span>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<Brain className="h-4 w-4 text-muted-foreground flex-shrink-0" />
								<span className="">Select intelligence...</span>
							</div>
						)}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="p-0 w-[90vw] md:w-[700px] md:mx-4 max-h-[min(25rem,var(--radix-popover-content-available-height))] overflow-hidden"
					align="start"
					side={popoverSide}
					sideOffset={4}
					collisionPadding={12}
				>
					<Command>
						<div className="flex max-h-[min(25rem,var(--radix-popover-content-available-height))]">
							<IntelligenceList
								listId={listId}
								options={pickerOptions}
								recommendedKeys={pickerRecommendedKeys}
								selected={selected}
								onSelect={handleSelect}
								onHover={setHovered}
							/>
							<IntelligenceDetailsPanel options={pickerOptions} hovered={hovered} selected={selected} />
						</div>
					</Command>
				</PopoverContent>
			</Popover>
		);
	},
);

IntelligenceCombobox.displayName = 'IntelligenceCombobox';

export function defaultIntelligencePickerOptions(options: DisplayIntelligence[]): IntelligencePickerResolvedOptions {
	//
	const recommendedKeys = RECOMMENDED_INTELLIGENCE_KEYS;
	const visibleOptions = options.filter(
		(intelligence) => !intelligence.target || recommendedKeys.includes(intelligence.key),
	);

	return {
		options: visibleOptions.map(optionFromIntelligence),
		recommendedKeys,
	};
}

export function intelligencePickerOptionsFromData(data: IntelligencePickerData): IntelligencePickerResolvedOptions {
	//
	const recommendedKeys = data.recommended.map((intelligence) => intelligence.key);
	const visibleOptions = data.intelligences.filter(
		(intelligence) => !intelligence.target || recommendedKeys.includes(intelligence.key),
	);

	return {
		options: visibleOptions.map(optionFromIntelligence),
		recommendedKeys,
	};
}

function optionFromIntelligence(intelligence: DisplayIntelligence): IntelligencePickerOption {
	//
	return {
		key: intelligence.key,
		name: intelligence.name,
		provider: intelligence.providerName,
		description: intelligence.description,
		target: intelligence.target,
		pricing: intelligence.pricing,
		context: intelligence.context,
		intelligenceLevel: intelligence.intelligenceLevel,
		sourceKey: intelligence.target,
		budgetCeiling: intelligence.budgetCeiling,
	};
}

import { DEFAULT_INTELLIGENCE, intelligenceKeys, type IntelligenceKey } from 'convex/schemas/intelligenceSchema';
import { Brain, ChevronsUpDown } from 'lucide-react';
import { forwardRef, Suspense, useCallback, useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import { useIntelligences } from '~/hooks/query/useIntelligences';
import { cn } from '~/lib/utils';
import { IntelligenceList, IntelligenceSelectorProps } from './IntelligenceList';
import { IntelligenceDetailsPanel } from '~/components/IntelligenceSelector';

export const IntelligenceSelector = forwardRef<HTMLButtonElement, IntelligenceSelectorProps>(
	({ value, onChange, className, disabled = false }, ref) => {
		//
		return (
			<Suspense fallback={<Skeleton className="w-60 h-8" />}>
				<IntelligenceCombobox
					value={value}
					onChange={onChange}
					ref={ref}
					className={className}
					disabled={disabled}
				/>
			</Suspense>
		);
	},
);

IntelligenceSelector.displayName = 'IntelligenceSelector';

const IntelligenceCombobox = forwardRef<HTMLButtonElement, IntelligenceSelectorProps>(
	({ value, onChange, className, disabled = false }, ref) => {
		//
		const { intelligences } = useIntelligences();

		const [open, setOpen] = useState(false);
		const [commandValue, setCommandValue] = useState('');
		const [hovered, setHovered] = useState<IntelligenceKey | null>(null);
		const [keyboardFocused, setKeyboardFocused] = useState<IntelligenceKey | null>(null);
		const [selected, setSelected] = useState<IntelligenceKey>(value ?? DEFAULT_INTELLIGENCE);

		useEffect(() => {
			setSelected(value ?? DEFAULT_INTELLIGENCE);
		}, [value]);

		// When the popover opens, reset the keyboard focus to show selected model details
		useEffect(() => {
			if (open) {
				setKeyboardFocused(null);
				setCommandValue('');
			}
		}, [open]);

		// Update keyboard focused model when command value changes (keyboard navigation)
		useEffect(() => {
			if (commandValue && commandValue !== selected) {
				const parsed = intelligenceKeys.safeParse(commandValue);
				setKeyboardFocused(parsed.success ? parsed.data : null);
			}
		}, [commandValue, selected]);

		const selectedOption = Object.values(intelligences).find(
			(intelligence) => intelligence.key === selected, //
		);

		const displayedIntelligence = Object.values(intelligences).find(
			(intelligence) => intelligence.key === (keyboardFocused || hovered || selected),
		);

		const handleSelect = useCallback(
			(key: string) => {
				const parsed = intelligenceKeys.safeParse(key);
				if (parsed.success) {
					setOpen(false);
					setSelected(parsed.data);
					onChange(parsed.data);
				} else {
					console.error('Invalid intelligence key', key);
				}
			},
			[onChange],
		);

		const handleHover = useCallback((key: IntelligenceKey | null) => {
			setHovered(key);
		}, []);

		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						ref={ref}
						variant="outline"
						role="combobox"
						aria-expanded={open}
						disabled={disabled}
						className={cn(
							'w-full justify-between rounded-xl px-3 py-2 text-sm',
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
					className="p-0 w-[90vw] md:w-[700px] md:mx-4 overflow-visible"
					align="start"
					sideOffset={4}
					avoidCollisions={true}
				>
					<div className="flex h-[400px] max-h-[70vh] md:h-[400px] overflow-hidden">
						<IntelligenceList
							options={Object.values(intelligences)}
							selected={selected}
							commandValue={commandValue}
							onCommandValueChange={setCommandValue}
							onSelect={handleSelect}
							onHover={handleHover}
						/>
						<IntelligenceDetailsPanel intelligence={displayedIntelligence} />
					</div>
				</PopoverContent>
			</Popover>
		);
	},
);

IntelligenceCombobox.displayName = 'IntelligenceCombobox';

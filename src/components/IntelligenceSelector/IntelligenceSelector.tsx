import { DEFAULT_INTELLIGENCE, intelligenceKeys, type IntelligenceKey } from 'convex/schemas/intelligenceSchema';
import { Brain, ChevronsUpDown } from 'lucide-react';
import { forwardRef, Suspense, useCallback, useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Command } from '~/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import { useIntelligences } from '~/hooks/query/useIntelligences';
import { cn } from '~/lib/utils';
import { IntelligenceDetailsPanel } from './IntelligenceDetailsPanel';
import { IntelligenceList, IntelligenceSelectorProps } from './IntelligenceList';

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
		const [hovered, setHovered] = useState<IntelligenceKey | null>(null);
		const [selected, setSelected] = useState<IntelligenceKey>(value ?? DEFAULT_INTELLIGENCE);

		useEffect(() => {
			setSelected(value ?? DEFAULT_INTELLIGENCE);
		}, [value]);

		const selectedOption = Object.values(intelligences).find(
			(intelligence) => intelligence.key === selected, //
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
					className="p-0 w-[90vw] md:w-[700px] md:mx-4"
					align="start"
					sideOffset={4}
					avoidCollisions={true}
				>
					<Command>
						<div className="flex h-[400px] max-h-[70vh] md:h-[400px]">
							<IntelligenceList
								options={Object.values(intelligences)}
								selected={selected}
								onSelect={handleSelect}
								onHover={handleHover}
							/>
							<IntelligenceDetailsPanel hovered={hovered} selected={selected} />
						</div>
					</Command>
				</PopoverContent>
			</Popover>
		);
	},
);

IntelligenceCombobox.displayName = 'IntelligenceCombobox';

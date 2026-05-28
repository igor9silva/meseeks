import { DEFAULT_INTELLIGENCE, intelligenceKeys, type IntelligenceKey } from 'schemas/intelligenceSchema';
import { Brain, ChevronsUpDown } from 'lucide-react';
import { forwardRef, Suspense, useId, useState } from 'react';
import { Button } from '@reactor/ui/button';
import { Command } from '@reactor/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@reactor/ui/popover';
import { Skeleton } from '@reactor/ui/skeleton';
import { useIntelligences } from '~/hooks/query/useIntelligences';
import { cn } from '@reactor/ui/lib/utils';
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
		const listId = useId();
		const selected = value ?? DEFAULT_INTELLIGENCE;

		const selectedOption = Object.values(intelligences).find(
			(intelligence) => intelligence.key === selected, //
		);

		const handleSelect = (key: string) => {
			const parsed = intelligenceKeys.safeParse(key);
			if (parsed.success) {
				setOpen(false);
				onChange(parsed.data);
			} else {
				console.error('Invalid intelligence key', key);
			}
		};

		const handleHover = (key: IntelligenceKey | null) => {
			setHovered(key);
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
								<span className="">Select intelligence…</span>
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
								listId={listId}
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

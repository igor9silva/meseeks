import { modelsSchema } from 'convex/schemas/skillSchema';
import { Brain, ChevronsUpDown } from 'lucide-react';
import { forwardRef, Suspense, useEffect, useState } from 'react';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '~/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import { useIntelligences } from '~/hooks/query/useIntelligences';
import { cn } from '~/lib/utils';

// TODO: display the model cost

type IntelligenceKey = z.infer<typeof modelsSchema>;

export const IntelligenceSelector = forwardRef<
	HTMLButtonElement,
	{
		value?: IntelligenceKey;
		onChange: (value: IntelligenceKey) => void;
		className?: string;
	}
>(({ value, onChange, className }, ref) => {
	//
	return (
		<Suspense fallback={<Skeleton className="w-60 h-8" />}>
			<IntelligenceCombobox value={value} onChange={onChange} ref={ref} className={className} />
		</Suspense>
	);
});

IntelligenceSelector.displayName = 'IntelligenceSelector';

interface IntelligenceOption {
	key: string;
	name: string;
	provider: string;
}

interface RecommendedIntelligenceOption extends IntelligenceOption {
	description: string;
}

// Type guard for recommended options with descriptions
function hasDescription(intelligence: IntelligenceOption): intelligence is RecommendedIntelligenceOption {
	return 'description' in intelligence && Boolean((intelligence as RecommendedIntelligenceOption).description);
}

const IntelligenceCombobox = forwardRef<
	HTMLButtonElement,
	{
		value?: IntelligenceKey;
		onChange: (value: IntelligenceKey) => void;
		className?: string;
	}
>(({ value, onChange, className }, ref) => {
	//
	const { intelligences } = useIntelligences();

	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState(value ?? intelligences.default);

	useEffect(() => {
		setSelected(value ?? intelligences.default);
	}, [value, intelligences.default]);

	const selectedOption = [...intelligences.recommended, ...intelligences.all].find(
		(intelligence) => intelligence.key === selected,
	);

	const handleSelect = (key: string) => {
		const parsed = modelsSchema.safeParse(key);
		if (parsed.success) {
			setOpen(false);
			setSelected(parsed.data);
			onChange(parsed.data);
		} else {
			console.error('Invalid intelligence key', key);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					ref={ref}
					variant="outline"
					role="combobox"
					aria-expanded={open}
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
							<span className="truncate hidden md:inline">{selectedOption.name}</span>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<Brain className="h-4 w-4 text-muted-foreground flex-shrink-0" />
							<span className="hidden md:inline">Select intelligence...</span>
						</div>
					)}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
				sideOffset={4}
				style={{ minWidth: '270px' }}
			>
				<Command>
					<CommandInput placeholder="Search intelligence..." />
					<CommandList>
						<CommandEmpty>No intelligence found.</CommandEmpty>

						<CommandGroup heading="Recommended">
							{intelligences.recommended.map((intelligence) => (
								<CommandItem
									key={intelligence.key}
									value={intelligence.key}
									onSelect={handleSelect}
									className={cn('py-2', selected === intelligence.key && 'bg-accent/75')}
								>
									<div className="flex flex-col w-full">
										<div className="flex w-full justify-between items-center">
											<span className="font-medium">{intelligence.name}</span>
											<span className="text-xs text-muted-foreground">
												by {intelligence.provider}
											</span>
										</div>
										{hasDescription(intelligence) && (
											<span className="text-xs text-muted-foreground mt-1">
												{intelligence.description}
											</span>
										)}
									</div>
								</CommandItem>
							))}
						</CommandGroup>

						<CommandSeparator />

						<CommandGroup>
							{intelligences.all.map((intelligence) => (
								<CommandItem
									key={intelligence.key}
									value={intelligence.key}
									onSelect={handleSelect}
									className={cn(selected === intelligence.key && 'bg-accent/75')}
								>
									<div className="flex w-full justify-between items-center">
										<span>{intelligence.name}</span>
										<span className="text-xs text-muted-foreground">
											by {intelligence.provider}
										</span>
									</div>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
});

IntelligenceCombobox.displayName = 'IntelligenceCombobox';

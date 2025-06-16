import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { modelsSchema } from 'convex/schemas/skillSchema';
import { Brain, ChevronsUpDown } from 'lucide-react';
import { Suspense, useState } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

// TODO: display the model cost

type IntelligenceKey = z.infer<typeof modelsSchema>;

export function IntelligenceSelector({
	value,
	onChange,
	className,
}: {
	value?: IntelligenceKey;
	onChange: (value: IntelligenceKey) => void;
	className?: string;
}) {
	//
	return (
		<div className={cn('flex items-center gap-2', className)}>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="flex-shrink-0">
							<Brain className="h-4 w-4 text-muted-foreground" />
						</div>
					</TooltipTrigger>
					<TooltipContent side="bottom">
						<p>The intelligence to power this task</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<Suspense fallback={<Skeleton className="w-60 h-8" />}>
				<IntelligenceCombobox value={value} onChange={onChange} />
			</Suspense>
		</div>
	);
}

// Define interface for intelligence options from the API
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

function IntelligenceCombobox({
	value,
	onChange,
	className,
}: {
	value?: IntelligenceKey;
	onChange: (value: IntelligenceKey) => void;
	className?: string;
}) {
	//
	const query = convexQuery(api.skills.public.availableIntelligences, {});
	const { data: intelligences } = useSuspenseQuery(query);

	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState(value ?? intelligences.default);

	const selectedOption = [...intelligences.recommended, ...intelligences.all].find(
		(intelligence) => intelligence.key === selected,
	);

	const handleSelect = (key: string) => {
		const parsed = modelsSchema.safeParse(key);
		if (parsed.success) {
			setOpen(false);
			setSelected(parsed.data);
			onChange(parsed.data);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						'w-full justify-between rounded-md px-3 py-2 text-sm',
						'flex h-9 items-center shadow-sm ring-offset-background',
						'border border-input bg-transparent focus:outline-none',
						'focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
						'data-[placeholder]:text-muted-foreground',
						className,
					)}
				>
					{selectedOption ? (
						<div className="flex items-center gap-2 truncate">
							<span className="truncate">{selectedOption.name}</span>
						</div>
					) : (
						'Select intelligence...'
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
					<CommandInput placeholder="Search intelligences..." />
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
}

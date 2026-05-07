import { Check, ChevronsUpDown } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from './button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from './lib/utils';

export interface ComboboxOption {
	value: string;
	label: string;
}

interface ComboboxProps {
	options: ComboboxOption[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	emptyMessage?: string;
	className?: string;
	disabled?: boolean;
}

export function Combobox({
	options,
	value,
	onChange,
	placeholder = 'Select option...',
	emptyMessage = 'No results found.',
	className,
	disabled = false,
}: ComboboxProps) {
	//
	const [open, setOpen] = useState(false);
	const listId = useId();

	const selectedOption = options.find((option) => option.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- radix popover uses a button trigger for the combobox; a native input would fight command selection
					role="combobox"
					aria-expanded={open}
					aria-controls={listId}
					className={cn(
						'w-full justify-between rounded-full px-3 py-2 text-sm',
						'flex h-9 items-center shadow-sm ring-offset-background',
						'border border-input bg-transparent focus:outline-none',
						'focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
						'data-[placeholder]:text-muted-foreground',
						className,
					)}
					disabled={disabled}
				>
					{selectedOption ? selectedOption.label : placeholder}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
				sideOffset={4}
				style={{ minWidth: '240px' }}
			>
				<Command>
					<CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
					<CommandList id={listId}>
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.value}
									onSelect={(currentValue: string) => {
										onChange(currentValue);
										setOpen(false);
									}}
								>
									{option.label}
									<Check
										className={cn(
											'ml-auto h-4 w-4',
											value === option.value ? 'opacity-100' : 'opacity-0',
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

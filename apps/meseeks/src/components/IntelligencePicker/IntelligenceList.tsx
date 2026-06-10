import { CommandEmpty, CommandGroup, CommandInput, CommandList, CommandSeparator } from '@reactor/ui/command';
import { isDefined } from 'lib/guards';
import { IntelligenceOption } from './index';
import type { IntelligencePickerOption } from './types';

interface IntelligenceListProps {
	listId: string;
	options: IntelligencePickerOption[];
	recommendedKeys: string[];
	selected: string;
	onSelect: (key: string) => void;
	onHover: (key: string | null) => void;
}

export function IntelligenceList({
	listId,
	options,
	recommendedKeys,
	selected,
	onSelect,
	onHover,
}: IntelligenceListProps) {
	//
	const recommendedOptions = recommendedKeys
		.map((key) => options.find((option) => option.key === key))
		.filter(isDefined);
	//
	const otherOptions = options.filter((option) => !recommendedKeys.includes(option.key));

	return (
		<div className="flex-1 min-w-0 md:border-r">
			<CommandInput placeholder="Search intelligences..." className="border-none" />
			<CommandList id={listId} className="max-h-full">
				<CommandEmpty>No intelligence found.</CommandEmpty>

				<CommandGroup heading="Recommended">
					{recommendedOptions.map((intelligence) => (
						<IntelligenceOption
							key={intelligence.key}
							intelligence={intelligence}
							selected={selected}
							onSelect={onSelect}
							onHover={onHover}
							shouldShowDescription
							isRecommended
						/>
					))}
				</CommandGroup>

				<CommandSeparator />

				<CommandGroup heading="Other">
					{otherOptions.map((intelligence) => (
						<IntelligenceOption
							key={intelligence.key}
							intelligence={intelligence}
							selected={selected}
							onSelect={onSelect}
							onHover={onHover}
							shouldShowDescription={false}
							isRecommended={false}
						/>
					))}
				</CommandGroup>
			</CommandList>
		</div>
	);
}

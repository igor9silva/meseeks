import { CommandEmpty, CommandGroup, CommandInput, CommandList, CommandSeparator } from '@reactor/ui/command';
import { isDefined } from 'lib/guards';
import { INTELLIGENCE_PROGRESSION, type IntelligenceKey, type Intelligence } from 'schemas/intelligenceSchema';
import { IntelligenceOption } from './index';

export interface IntelligenceSelectorProps {
	value?: IntelligenceKey;
	onChange: (value: IntelligenceKey) => void;
	className?: string;
	disabled?: boolean;
}

interface IntelligenceListProps {
	listId: string;
	options: Intelligence[];
	selected: string;
	onSelect: (key: string) => void;
	onHover: (key: IntelligenceKey | null) => void;
}

export function IntelligenceList({ listId, options, selected, onSelect, onHover }: IntelligenceListProps) {
	//
	const progressionKeys = Object.keys(INTELLIGENCE_PROGRESSION) as IntelligenceKey[];
	//
	// sort by progression level
	const recommendedOptions = progressionKeys
		.map((key) => options.find((option) => option.key === key))
		.filter(isDefined);
	//
	const otherOptions = options.filter((option) => !(option.key in INTELLIGENCE_PROGRESSION));

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

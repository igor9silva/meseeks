import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandList,
	CommandSeparator,
} from '~/components/ui/command';
import { INTELLIGENCE_PROGRESSION, type IntelligenceKey, type Intelligence } from 'convex/schemas/intelligenceSchema';
import { IntelligenceOption } from './index';

export interface IntelligenceSelectorProps {
	value?: IntelligenceKey;
	onChange: (value: IntelligenceKey) => void;
	className?: string;
	disabled?: boolean;
}

interface IntelligenceListProps {
	options: Intelligence[];
	selected: string;
	commandValue: string;
	onCommandValueChange: (value: string) => void;
	onSelect: (key: string) => void;
	onHover: (key: IntelligenceKey | null) => void;
}

export function IntelligenceList({
	options,
	selected,
	commandValue,
	onCommandValueChange,
	onSelect,
	onHover,
}: IntelligenceListProps) {
	//
	const progressionKeys = Object.keys(INTELLIGENCE_PROGRESSION) as IntelligenceKey[];
	//
	// sort by progression level
	const recommendedOptions = progressionKeys
		.map((key) => options.find((option) => option.key === key))
		.filter((option): option is Intelligence => Boolean(option));
	//
	const otherOptions = options.filter((option) => !(option.key in INTELLIGENCE_PROGRESSION));

	return (
		<div className="flex-1 min-w-0 md:border-r">
			<Command value={commandValue} onValueChange={onCommandValueChange}>
				<CommandInput placeholder="Search intelligences..." className="border-none" />
				<CommandList className="max-h-full my-1">
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
			</Command>
		</div>
	);
}

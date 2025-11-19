import { CommandItem } from '~/components/ui/command';
import { cn } from '~/lib/utils';
import { type IntelligenceKey, type Intelligence } from 'convex/schemas/intelligenceSchema';
import { formatPricing, formatWordCount } from '~/lib/intelligence-utils';

interface IntelligenceOptionProps {
	intelligence: Intelligence;
	selected: string;
	onSelect: (key: string) => void;
	onHover: (key: IntelligenceKey | null) => void;
	shouldShowDescription: boolean;
	isRecommended: boolean;
}

export function IntelligenceOption({
	intelligence,
	selected,
	onSelect,
	onHover,
	shouldShowDescription,
	isRecommended,
}: IntelligenceOptionProps) {
	//
	const formattedPricing = formatPricing(intelligence.pricing);
	const formattedMaxWords = formatWordCount(intelligence.context.maxWords);

	return (
		<CommandItem
			key={intelligence.key}
			value={intelligence.key}
			onSelect={onSelect}
			onMouseEnter={() => onHover(intelligence.key)}
			onMouseLeave={() => onHover(null)}
			className={cn('cursor-pointer', selected === intelligence.key && 'bg-accent/75')}
		>
			<div className="flex flex-col w-full gap-1">
				<div className="flex w-full justify-between items-center">
					<span className={cn(isRecommended && 'font-medium')}>{intelligence.name}</span>
					<span className="text-xs text-muted-foreground flex-shrink-0">by {intelligence.provider}</span>
				</div>
				{shouldShowDescription && intelligence.description && (
					<span className="text-xs text-muted-foreground leading-relaxed">{intelligence.description}</span>
				)}
				{/* Mobile-only: Show some key details inline */}
				<div className="md:hidden text-xs text-muted-foreground">
					<span>
						⚡ ~${formattedPricing.estimatedPerMillionWords} per million words, up to ~{formattedMaxWords}.
					</span>
				</div>
			</div>
		</CommandItem>
	);
}

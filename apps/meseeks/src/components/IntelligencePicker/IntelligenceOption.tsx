import { CommandItem } from '@pro/ui/command';
import { cn } from '@pro/ui/lib/utils';
import type { IntelligencePickerOption } from './types';

interface IntelligenceOptionProps {
	intelligence: IntelligencePickerOption;
	selected: string;
	onSelect: (key: string) => void;
	onHover: (key: string | null) => void;
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
	return (
		<CommandItem
			key={intelligence.key}
			value={[intelligence.name, intelligence.provider, intelligence.description].filter(Boolean).join(' ')}
			onSelect={() => onSelect(intelligence.key)}
			onMouseEnter={() => onHover(intelligence.key)}
			onMouseLeave={() => onHover(null)}
			className={cn('cursor-pointer', selected === intelligence.key && 'bg-accent/75')}
		>
			<div className="flex flex-col w-full">
				<div className="flex w-full justify-between items-center">
					<span className={cn(isRecommended && 'font-medium')}>{intelligence.name}</span>
					<span className="text-xs text-muted-foreground flex-shrink-0">by {intelligence.provider}</span>
				</div>
				{shouldShowDescription && intelligence.description && (
					<span className="text-xs text-muted-foreground leading-relaxed">{intelligence.description}</span>
				)}
			</div>
		</CommandItem>
	);
}

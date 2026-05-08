import { cn } from '@reactor/ui/lib/utils';

interface IntelligenceRatingProps {
	level: number;
	showNumeric?: boolean;
	className?: string;
}

export function IntelligenceRating({ level, showNumeric = true, className }: IntelligenceRatingProps) {
	//
	const currentLevel = level;

	return (
		<div className={cn('flex items-center gap-1', className)}>
			{Array.from({ length: 10 }, (_, i) => {
				const dotLevel = i + 1;
				const isActive = dotLevel <= currentLevel;
				return (
					<div
						key={dotLevel}
						className={cn(
							'w-2 h-2 rounded-3xl transition-colors',
							isActive ? 'bg-primary' : 'bg-muted-foreground/20',
						)}
					/>
				);
			})}
			{showNumeric && <span className="ml-2 text-xs text-muted-foreground">{level}/10</span>}
		</div>
	);
}

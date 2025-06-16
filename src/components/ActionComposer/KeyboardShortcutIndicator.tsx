import { cn } from '~/lib/utils';

interface KeyboardShortcutIndicatorProps {
	//
	keySymbol?: string;
	text?: string;
	className?: string;
}

export function KeyboardShortcutIndicator({ keySymbol, text, className }: KeyboardShortcutIndicatorProps) {
	//
	return (
		<span className="items-center text-xs text-muted-foreground gap-1.5 hidden md:flex">
			<kbd
				className={cn('inline-flex items-center rounded font-medium h-5 bg-background px-1 text-lg', className)}
			>
				<span className="mr-0.5 pt-0.5">⌘</span>
				{keySymbol && <span className="text-xl">{keySymbol}</span>}
			</kbd>
			{text}
		</span>
	);
}

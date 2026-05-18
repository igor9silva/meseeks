import { Maximize2, PanelLeftOpen } from 'lucide-react';

export function CollapsedCurrentPanel({
	onExpand,
	onExpandedToggle,
}: {
	onExpand: () => void;
	onExpandedToggle: () => void;
}) {
	//
	return (
		<div className="mr-2 flex h-full w-10 shrink-0 flex-col items-center gap-1 border border-border/80 bg-card pt-2">
			<button
				type="button"
				aria-label="Expand left panel"
				title="Expand left panel"
				onClick={onExpand}
				className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
			>
				<PanelLeftOpen className="size-4" />
			</button>
			<button
				type="button"
				aria-label="Expand current panel"
				title="Expand current panel"
				onClick={onExpandedToggle}
				className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
			>
				<Maximize2 className="size-4" />
			</button>
		</div>
	);
}

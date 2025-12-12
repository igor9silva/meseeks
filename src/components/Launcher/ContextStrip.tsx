import { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'convex/lib/money';
import { FileText, Sparkles, Zap } from 'lucide-react';
import { cn } from '~/lib/utils';

interface ContextStripProps {
	//
	task?: Doc<'tasks'>;
	className?: string;
}

export function ContextStrip({ task, className }: ContextStripProps) {
	//
	if (!task) {
		return (
			<div className={cn('flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground', className)}>
				<Sparkles className="size-3.5" />
				<span>New task</span>
			</div>
		);
	}

	const title = task.title || 'Untitled task';
	const availableBudget = asDollars({ bigInt: task.energyBudget.available });

	return (
		<div
			className={cn(
				'flex items-center justify-between gap-2 px-3 py-1.5 text-xs border-b bg-muted/30',
				className,
			)}
		>
			<div className="flex items-center gap-2 min-w-0">
				<FileText className="size-3.5 text-muted-foreground flex-shrink-0" />
				<span className="truncate text-muted-foreground">{title}</span>
			</div>
			<div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
				<Zap className="size-3" />
				<span>{availableBudget}</span>
			</div>
		</div>
	);
}

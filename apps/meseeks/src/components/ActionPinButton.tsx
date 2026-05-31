import { Pin } from 'lucide-react';
import { Button } from '@reactor/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { cn } from '@reactor/ui/lib/utils';

export function ActionPinButton({
	isPinned,
	onToggle,
	className,
}: {
	isPinned: boolean;
	onToggle: () => void;
	className?: string;
}) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant={isPinned ? 'secondary' : 'outline'}
						size="icon"
						onClick={(event) => {
							event.stopPropagation();
							onToggle();
						}}
						className={cn('size-6 border bg-background/95 shadow-sm', className)}
						aria-label={isPinned ? 'Remove anchor' : 'Pin to working memory'}
						aria-pressed={isPinned}
					>
						{isPinned ? <Pin className="size-3.5 fill-current" /> : <Pin className="size-3.5" />}
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">
					{isPinned ? 'Remove anchor' : 'Pin to working memory'}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@pro/ui/collapsible';
import MDX from '~/components/ui/mdx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@pro/ui/tooltip';
import { cn } from '@pro/ui/lib/utils';

export function CollapsibleSummary({ summary }: { summary: string }) {
	//
	const [isSummaryOpen, setIsSummaryOpen] = useState(false);

	return (
		<Collapsible open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
			<CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg p-3 text-left text-sm hover:bg-muted/50">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="cursor-help font-medium underline decoration-muted-foreground/30 underline-offset-2">
								Summary
							</span>
						</TooltipTrigger>
						<TooltipContent className="text-xs">
							A summary of all the file actions. Enables long conversations managed by the loop.
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', isSummaryOpen && 'rotate-180')} />
			</CollapsibleTrigger>
			<CollapsibleContent className="p-2">
				<MDX text={summary} />
			</CollapsibleContent>
		</Collapsible>
	);
}

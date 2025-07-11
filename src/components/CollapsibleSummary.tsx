import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import MDX from '~/components/ui/mdx';
import { cn } from '~/lib/utils';

export function CollapsibleSummary({ summary }: { summary: string }) {
	//
	const [isSummaryOpen, setIsSummaryOpen] = useState(false);

	return (
		<Collapsible open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
			<CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 hover:bg-muted/50 rounded">
				<ChevronDown className={cn('h-4 w-4 transition-transform', isSummaryOpen && 'rotate-180')} />
				<span className="text-sm font-medium">Summary</span>
			</CollapsibleTrigger>
			<CollapsibleContent className="p-2">
				<MDX text={summary} />
			</CollapsibleContent>
		</Collapsible>
	);
}

import { InfoIcon } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

type SkillTooltipProps = {
	//
	badgeLabel: string;
	tooltipTitle: string;
	items: string[];
};

export function SkillTooltip({ badgeLabel, tooltipTitle, items }: SkillTooltipProps) {
	//
	if (!items || items.length === 0) return null;

	return (
		<TooltipProvider>
			<Tooltip defaultOpen={false}>
				<TooltipTrigger asChild>
					<div className="inline-block">
						<Badge variant="outline" className="cursor-help">
							<InfoIcon className="h-3 w-3 mr-1" />
							{items.length} {badgeLabel}
						</Badge>
					</div>
				</TooltipTrigger>
				<TooltipContent side="top" className="p-2 max-w-xs">
					<p className="font-semibold mb-1">{tooltipTitle}:</p>
					<ul className="ml-4 list-disc text-sm">
						{items.map((item, index) => (
							<li key={index}>{item}</li>
						))}
					</ul>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

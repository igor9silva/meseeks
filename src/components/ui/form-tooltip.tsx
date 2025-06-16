import { InfoIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { Label } from '~/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

interface LabelWithTooltipProps {
	//
	htmlFor?: string;
	children: ReactNode;
	tooltip: string;
	className?: string;
}

export function LabelWithTooltip({ htmlFor, children, tooltip, className }: LabelWithTooltipProps) {
	//
	return (
		<Label htmlFor={htmlFor} className={className}>
			{children}
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<InfoIcon className="h-4 w-4 inline-block ml-1" />
					</TooltipTrigger>
					<TooltipContent>
						<p className="max-w-xs">{tooltip}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</Label>
	);
}

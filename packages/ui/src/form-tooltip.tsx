import { InfoIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { Label } from './label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface LabelWithTooltipProps {
	//
	htmlFor?: string;
	children: ReactNode;
	tooltip: string;
	className?: string;
	renderAsDrawerOnMobile?: boolean;
}

export function LabelWithTooltip({
	htmlFor,
	children,
	tooltip,
	className,
	renderAsDrawerOnMobile = true, // default to true for form help text
}: LabelWithTooltipProps) {
	//
	return (
		<Label htmlFor={htmlFor} className={className}>
			{children}
			<TooltipProvider>
				<Tooltip renderAsDrawerOnMobile={renderAsDrawerOnMobile}>
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

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';

export function EnergyTooltip({
	children,
	className,
	tabIndex,
}: {
	children: React.ReactNode;
	className?: string;
	tabIndex?: number;
}) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger className={className} tabIndex={tabIndex}>
					{children}
				</TooltipTrigger>
				<TooltipContent>
					<strong>Energy</strong>, US Dollar-equivalent credits.
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

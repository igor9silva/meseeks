import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

export function EnergyTooltip({ children, className }: { children: React.ReactNode; className?: string }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger className={className}>{children}</TooltipTrigger>
				<TooltipContent>
					<strong>Energy</strong>, US Dollar-equivalent credits.
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

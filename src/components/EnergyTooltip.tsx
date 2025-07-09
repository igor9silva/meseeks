import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

export function EnergyTooltip({ children }: { children: React.ReactNode }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>{children}</TooltipTrigger>
				<TooltipContent>
					<strong>Energy</strong>, US Dollar-equivalent credits.
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

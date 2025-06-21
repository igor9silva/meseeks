import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

export function EnergyCredits({ className }: { className?: string }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger className={className}>energy</TooltipTrigger>
				<TooltipContent>Energy units for AI tasks</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

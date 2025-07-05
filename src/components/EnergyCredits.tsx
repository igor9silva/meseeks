import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

export function EnergyCredits({ className }: { className?: string }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger className={className}>⚡</TooltipTrigger>
				<TooltipContent>
					<strong>Energy</strong>, US Dollar-equivalent credits.
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

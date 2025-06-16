import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

export function DollarCredits({ className }: { className?: string }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger className={className}>USDc</TooltipTrigger>
				<TooltipContent>US Dollar-equivalent credits</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

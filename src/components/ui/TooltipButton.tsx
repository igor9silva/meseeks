import { type ButtonProps } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { Button } from './button';

interface TooltipButtonProps extends ButtonProps {
	//
	tooltipContent: React.ReactNode;
}

export function TooltipButton({ tooltipContent, children, ...props }: TooltipButtonProps) {
	//
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button {...props}>{children}</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltipContent}</TooltipContent>
		</Tooltip>
	);
}

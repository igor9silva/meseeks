import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

interface ActionButtonProps {
	//
	icon: React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
	tooltip?: string;
	variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
	className?: string;
}

export function ActionButton({
	icon,
	onClick,
	disabled = false,
	tooltip = '',
	variant = 'default',
	className = '',
}: ActionButtonProps) {
	//
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type="button"
					variant={variant}
					size="icon"
					className={cn('h-8 w-8 rounded-full', className)}
					onClick={onClick}
					disabled={disabled}
				>
					{icon}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}

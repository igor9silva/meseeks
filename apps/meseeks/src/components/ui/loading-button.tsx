import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '~/components/ui/button';

interface LoadingButtonProps extends ButtonProps {
	loading?: boolean;
	loadingText?: string;
	icon?: React.ReactNode;
}

export function LoadingButton({
	loading = false,
	loadingText,
	icon,
	children,
	disabled,
	...props
}: LoadingButtonProps) {
	//
	return (
		<Button disabled={disabled || loading} {...props}>
			{loading ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					{loadingText || children}
				</>
			) : (
				<>
					{icon}
					{children}
				</>
			)}
		</Button>
	);
}

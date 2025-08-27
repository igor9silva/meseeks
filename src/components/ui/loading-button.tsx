import { Link } from '@tanstack/react-router';
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

interface LoadingLinkProps {
	to: string;
	params?: Record<string, any>;
	search?: Record<string, any>;
	replace?: boolean;
	loading?: boolean;
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
}

export function LoadingLink({
	to,
	params,
	search,
	replace,
	loading = false,
	children,
	className,
	onClick,
}: LoadingLinkProps) {
	//
	const handleClick = () => {
		if (loading) return;
		onClick?.();
	};

	return (
		<Link to={to} params={params} search={search} replace={replace} className={className} onClick={handleClick}>
			{loading ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					{children}
				</>
			) : (
				children
			)}
		</Link>
	);
}

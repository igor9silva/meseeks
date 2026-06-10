const sizeClasses = {
	xs: 'size-1',
	sm: 'size-2',
	md: 'size-4',
	lg: 'size-8',
};

type StatusIndicatorProps = {
	size?: keyof typeof sizeClasses;
	className?: string;
	label?: string;
};

export function StatusIndicator({ size = 'sm', className = '', label = 'Status indicator' }: StatusIndicatorProps) {
	//
	return (
		<div
			className={`rounded-full flex-shrink-0 blur-[0.5px] ${sizeClasses[size]} ${className}`}
			aria-live="polite"
			aria-label={label}
		>
			<span className="sr-only">{label}</span>
		</div>
	);
}

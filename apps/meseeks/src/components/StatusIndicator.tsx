const sizeClasses = {
	xs: 'size-1',
	sm: 'size-2',
	md: 'size-4',
	lg: 'size-8',
};

type StatusIndicatorProps = {
	size?: keyof typeof sizeClasses;
	className?: string;
};

export function StatusIndicator({ size = 'sm', className = '' }: StatusIndicatorProps) {
	return (
		<div
			className={`rounded-full flex-shrink-0 blur-[0.5px] ${sizeClasses[size]} ${className}`}
			aria-live="polite"
			aria-label="Status Indicator"
		>
			{/* TODO: write this 👇 */}
			<span className="sr-only">Loading or active status</span>
		</div>
	);
}

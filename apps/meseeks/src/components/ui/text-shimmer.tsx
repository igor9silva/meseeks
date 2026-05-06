import { cn } from '~/lib/utils';

export function TextShimmer({
	text = 'Thinking',
	className,
	size = 'md',
}: {
	text?: string;
	className?: string;
	size?: 'sm' | 'md' | 'lg';
}) {
	const textSizes = {
		sm: 'text-xs',
		md: 'text-sm',
		lg: 'text-base',
	};

	return (
		<div
			className={cn(
				'bg-[linear-gradient(to_right,hsl(var(--muted-foreground))_40%,hsl(var(--foreground))_60%,hsl(var(--muted-foreground))_80%)]',
				'bg-[200%_auto] bg-clip-text font-medium text-transparent',
				'animate-[shimmer_2s_infinite_linear]',
				textSizes[size],
				className,
			)}
		>
			{text}
		</div>
	);
}

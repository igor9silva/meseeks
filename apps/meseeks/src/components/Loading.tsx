import { TextShimmer } from '~/components/ui/text-shimmer';
import { cn } from '~/lib/utils';

export function Loading({ className, text = 'Loading...' }: { className?: string; text?: string }) {
	return (
		<div className={cn('flex flex-col items-center justify-center h-full w-full gap-4', className)}>
			<TextShimmer text={text} />
		</div>
	);
}

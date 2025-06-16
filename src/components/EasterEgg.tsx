import { RotatingLoadingMessage } from '~/components/RotatingLoadingMessage';
import { cn } from '~/lib/utils';

export function EasterEgg({ className }: { className?: string }) {
	//
	return <RotatingLoadingMessage className={cn('h-20', className)} />;
}

import { cn } from '~/lib/utils';

export function BasicError({
	text, //
	className,
}: {
	text?: string;
	className?: string;
}) {
	return (
		<div className={cn('flex flex-col items-center justify-center h-full w-full gap-4', className)}>
			{text ?? 'failed'}
		</div>
	);
}

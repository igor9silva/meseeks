import { cn } from '~/lib/utils';

export function TwoColumn({
	children, //
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn('grid grid-cols-[repeat(auto-fit,minmax(24rem,1fr))] gap-2', className)}>
			{/**/}
			{children}
		</div>
	);
}

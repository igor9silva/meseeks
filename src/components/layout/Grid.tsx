import { forwardRef } from 'react';
import { cn } from '~/lib/utils';

export function Grid({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex gap-2 flex-wrap w-full text-ellipsis whitespace-nowrap [&>*]:grow [&>*]:max-h-fit">
			{children}
		</div>
	);
}

Grid.Main = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn('basis-3/5', className)} {...props} /> //
));
Grid.Main.displayName = 'MainItem';

Grid.Side = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, children, ...props }, ref) => (
		<div ref={ref} className={cn('flex flex-col gap-2 min-w-48', className)} {...props}>
			{children}
		</div>
	),
);
Grid.Side.displayName = 'SideItems';

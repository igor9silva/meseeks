import { cn } from '@reactor/ui';
import type { ReactNode } from 'react';

interface SectionProps {
	//
	title: string;
	icon: ReactNode;
	children: ReactNode;
	className?: string;
}

export function Section({ title, icon, children, className }: SectionProps) {
	//
	return (
		<section className={cn('min-h-0 border-b border-border/70 p-3 last:border-b-0', className)}>
			<div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				{icon}
				<span>{title}</span>
			</div>
			{children}
		</section>
	);
}

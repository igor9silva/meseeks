import { cn } from '@reactor/ui';

interface StatusPillProps {
	//
	status: string;
}

export function StatusPill({ status }: StatusPillProps) {
	//
	const tone =
		status === 'succeeded' || status === 'applied' || status === 'indexed'
			? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
			: status === 'failed'
				? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
				: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';

	return <span className={cn('rounded border px-1.5 py-0.5 text-[11px]', tone)}>{status}</span>;
}

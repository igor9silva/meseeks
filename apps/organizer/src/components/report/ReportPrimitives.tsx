import type { ReactNode } from 'react';
import { nextSort, type SortState } from './reportSort';
import { priorityClassName } from './reportFormat';

export function Metric({
	icon,
	label,
	value,
	detail,
}: {
	icon?: ReactNode;
	label: string;
	value: string;
	detail: string;
}) {
	//
	return (
		<div className="rounded-md border border-border bg-card p-4">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				{icon}
				{label}
			</div>
			<div className="mt-3 text-3xl font-semibold tabular-nums">{value}</div>
			<div className="mt-1 text-sm text-muted-foreground">{detail}</div>
		</div>
	);
}

export function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
	//
	return (
		<section className="rounded-md border border-border bg-zinc-950/70">
			<div className="flex items-center gap-2 border-b border-border px-4 py-3">
				{icon}
				<h2 className="text-lg font-semibold">{title}</h2>
			</div>
			<div className="p-4">{children}</div>
		</section>
	);
}

export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
	//
	return (
		<div className="mb-2">
			<div className="font-medium">{title}</div>
			{detail ? <div className="mt-1 text-sm text-muted-foreground">{detail}</div> : null}
		</div>
	);
}

export function Table({ children }: { children: ReactNode }) {
	//
	return (
		<div className="overflow-x-auto rounded-md border border-border bg-card">
			<table className="w-full min-w-full border-collapse text-sm">{children}</table>
		</div>
	);
}

export function SortableTh<TSort extends SortState>({
	label,
	sortKey,
	sort,
	onSort,
	align = 'left',
}: {
	label: string;
	sortKey: TSort['key'];
	sort: TSort;
	onSort: (sort: TSort) => void;
	align?: 'left' | 'right';
}) {
	//
	const isActive = sort.key === sortKey;
	const indicator = isActive && sort.direction === 'asc' ? '↑' : isActive ? '↓' : '';

	return (
		<th
			className={`border-b border-border bg-zinc-900 px-3 py-2 font-medium text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}
		>
			<button
				type="button"
				onClick={() => onSort(nextSort(sort, sortKey))}
				className={`inline-flex items-center gap-1 rounded text-left hover:text-foreground ${align === 'right' ? 'justify-end' : ''}`}
			>
				<span>{label}</span>
				<span className="w-3 text-xs">{indicator}</span>
			</button>
		</th>
	);
}

export function Td({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
	//
	return (
		<td
			className={`border-b border-border px-3 py-2 align-top last:border-b-0 ${align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
		>
			{children}
		</td>
	);
}

export function PriorityPill({ priority }: { priority: string }) {
	//
	return (
		<span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${priorityClassName(priority)}`}>
			{priority}
		</span>
	);
}

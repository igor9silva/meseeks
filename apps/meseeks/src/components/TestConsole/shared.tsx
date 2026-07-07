import { z } from 'zod/v3';
import type { ReactNode } from 'react';

export function Field({ label, value }: { label: string; value: ReactNode }) {
	//
	return (
		<div className="min-w-0">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="min-w-0 break-all font-mono text-xs">{value}</dd>
		</div>
	);
}

export function Result({ value }: { value: string }) {
	//
	if (!value) return null;

	return (
		<pre className="min-w-0 max-w-full max-h-56 overflow-y-auto overflow-x-hidden rounded-md bg-muted p-2 text-xs whitespace-pre-wrap break-all">
			{value}
		</pre>
	);
}

export function parseObject(value: string) {
	//
	const parsed: unknown = value.trim() ? JSON.parse(value) : {};

	return z.record(z.unknown()).parse(parsed);
}

export function formatJson(value: unknown) {
	//
	return (
		JSON.stringify(
			value,
			(_key, next: unknown) => {
				if (typeof next === 'bigint') return next.toString();

				return next;
			},
			2,
		) ?? ''
	);
}

export function formatError(error: unknown) {
	//
	if (error instanceof Error) return error.message;

	return String(error);
}

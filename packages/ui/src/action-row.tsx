import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';
import { cn } from './lib/utils';

export type ActionRowProps = {
	index: number;
	skill: string;
	status: string;
	author: string;
	createdAt: number;
	patch?: string;
	result?: string;
	defaultOpen?: boolean;
	actions?: React.ReactNode;
};

export function ActionRow({
	index,
	skill,
	status,
	author,
	createdAt,
	patch,
	result,
	defaultOpen = false,
	actions,
}: ActionRowProps) {
	//
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const hasDetails = Boolean(patch || result || actions);

	return (
		<div className="border-b border-border/70 py-2">
			<div className="flex min-h-9 items-center gap-2 text-sm">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-7 shrink-0"
					onClick={() => setIsOpen((value) => !value)}
					disabled={!hasDetails}
					title={isOpen ? 'Collapse action' : 'Expand action'}
				>
					{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
				</Button>
				<span className="w-10 shrink-0 tabular-nums text-muted-foreground">#{index}</span>
				<span className="min-w-0 flex-1 truncate font-medium">{skill}</span>
				<span
					className={cn(
						'rounded px-2 py-0.5 text-xs',
						status === 'succeeded' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
						status === 'running' && 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
						status === 'failed' && 'bg-destructive/10 text-destructive',
						status !== 'succeeded' &&
							status !== 'running' &&
							status !== 'failed' &&
							'bg-muted text-muted-foreground',
					)}
				>
					{status}
				</span>
				<span className="hidden w-32 shrink-0 truncate text-xs text-muted-foreground md:block">{author}</span>
				<time className="hidden w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block">
					{new Date(createdAt).toLocaleTimeString()}
				</time>
			</div>
			{isOpen && hasDetails && (
				<div className="ml-9 mt-2 space-y-2 text-sm">
					{result && <div className="whitespace-pre-wrap text-foreground">{result}</div>}
					{patch && (
						<pre className="overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">{patch}</pre>
					)}
					{actions && <div className="flex flex-wrap gap-2">{actions}</div>}
				</div>
			)}
		</div>
	);
}

import { ChevronDown, Loader2, Trash2, X } from 'lucide-react';
import { asDollars } from 'lib/money';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@reactor/ui/button';
import { useComposer } from '~/hooks/useComposer';
import { cn } from '@reactor/ui/lib/utils';
import type { EnqueuedSkill } from '../types';

const MAX_VISIBLE_ITEMS = 5;

interface QueueStripProps {
	//
	isCollapsed: boolean;
	onToggleCollapse: () => void;
}

export function QueueStrip({ isCollapsed, onToggleCollapse }: QueueStripProps) {
	//
	const { queue, pendingSkills, dequeue, clearQueue } = useComposer();
	const queueCount = queue.length;
	const pendingCount = pendingSkills.length;
	const count = queueCount + pendingCount;

	const handleClearClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			clearQueue();
		},
		[clearQueue],
	);

	if (count === 0) return null;

	// build header text
	const headerText = buildHeaderText(pendingCount, queueCount);

	// single item: render inline without header
	if (count === 1) {
		const singlePending = pendingSkills[0];
		const singleQueued = queue[0];

		return (
			<div className="border-t border-border/50 px-4 py-1.5">
				{singlePending && <PendingItem skill={singlePending} />}
				{singleQueued && <QueueItem skill={singleQueued} onRemove={dequeue} />}
			</div>
		);
	}

	// multiple items: collapsible list
	return (
		<div className="border-t border-border/50">
			{/* header - whole row clickable except clear button */}
			<button
				type="button"
				onClick={onToggleCollapse}
				className="flex w-full items-center justify-between px-4 py-1.5 hover:bg-muted/30 transition-colors"
			>
				<div className="flex items-center gap-1 text-sm text-muted-foreground">
					{pendingCount > 0 ? (
						<Loader2 className="size-3 animate-spin" />
					) : (
						<ChevronDown
							className={cn('size-3 transition-transform duration-150', isCollapsed && '-rotate-90')}
						/>
					)}
					<span>{headerText}</span>
				</div>
				{queueCount > 0 && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
						onClick={handleClearClick}
					>
						<Trash2 className="size-3 mr-1" />
						Clear
					</Button>
				)}
			</button>

			{/* animated content */}
			<AnimatedContent isCollapsed={isCollapsed} shouldScroll={count > MAX_VISIBLE_ITEMS}>
				{pendingSkills.map((skill) => (
					<PendingItem key={skill.id} skill={skill} />
				))}
				{queue.map((skill) => (
					<QueueItem key={skill.id} skill={skill} onRemove={dequeue} />
				))}
			</AnimatedContent>
		</div>
	);
}

function buildHeaderText(pendingCount: number, queueCount: number): string {
	//
	if (pendingCount > 0 && queueCount > 0) {
		return `Sending ${pendingCount}... (${queueCount} queued)`;
	}

	if (pendingCount > 0) {
		return `Sending ${pendingCount} action${pendingCount > 1 ? 's' : ''}...`;
	}

	return `${queueCount} queued`;
}

// memoized to prevent unnecessary re-renders
const AnimatedContent = memo(function AnimatedContent({
	children,
	isCollapsed,
	shouldScroll,
}: {
	children: React.ReactNode;
	isCollapsed: boolean;
	shouldScroll: boolean;
}) {
	//
	const contentRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<number | undefined>(undefined);

	// update height when content changes or collapse state changes
	useEffect(() => {
		//
		if (!innerRef.current || isCollapsed) return;

		const updateHeight = () => {
			if (innerRef.current) {
				setHeight(innerRef.current.scrollHeight);
			}
		};

		updateHeight();

		// observe for content changes
		const observer = new ResizeObserver(updateHeight);
		observer.observe(innerRef.current);

		return () => observer.disconnect();
	}, [isCollapsed]);

	return (
		<div
			ref={contentRef}
			className="overflow-hidden transition-[max-height] duration-150 ease-out"
			style={{ maxHeight: isCollapsed ? 0 : height }}
		>
			<div ref={innerRef} className={cn('px-4 pb-2 space-y-1', shouldScroll && 'max-h-40 overflow-y-auto')}>
				{children}
			</div>
		</div>
	);
});

// memoized queue item to prevent re-renders when other items change
const QueueItem = memo(function QueueItem({
	skill,
	onRemove,
}: {
	skill: EnqueuedSkill;
	onRemove: (id: string) => void;
}) {
	//
	const label = formatSkillLabel(skill.skillKey, skill.args);
	const handleRemove = useCallback(() => onRemove(skill.id), [onRemove, skill.id]);

	return (
		<div className={cn('flex items-center justify-between gap-2 text-sm', 'bg-muted/50 rounded-lg px-2 py-1')}>
			<span className="truncate">{label}</span>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-5 w-5 p-0 shrink-0 text-muted-foreground hover:text-foreground"
				onClick={handleRemove}
			>
				<X className="size-3" />
			</Button>
		</div>
	);
});

// pending item - shows a sending indicator, no remove button
const PendingItem = memo(function PendingItem({ skill }: { skill: EnqueuedSkill }) {
	//
	const label = formatSkillLabel(skill.skillKey, skill.args, true);

	return (
		<div
			className={cn(
				'flex items-center justify-between gap-2 text-sm',
				'bg-primary/10 text-primary rounded-lg px-2 py-1',
			)}
		>
			<span className="truncate">{label}</span>
			<Loader2 className="size-3 animate-spin shrink-0" />
		</div>
	);
});

function formatSkillLabel(skillKey: string, args: Record<string, unknown>, isPending = false): string {
	//
	switch (skillKey) {
		case 'updateBudget': {
			const energy = formatEnergyChange(skillKey, args);
			if (energy) return energy;
			return 'Change energy';
		}
		case 'say': {
			const message = getStringArg(args, 'message');
			if (message) {
				const truncated = message.length > 100 ? message.slice(0, 100) + '...' : message;
				return isPending ? `Saying: "${truncated}"` : `Say: "${truncated}"`;
			}
			return 'Say';
		}
		default:
			return skillKey;
	}
}

function formatEnergyChange(skillKey: string, args: Record<string, unknown>) {
	//
	const dollars = getNumberArg(args, 'dollars');
	if (dollars !== undefined) {
		const sign = energySign({ skillKey, amount: dollars });
		const value = Math.abs(dollars);
		return `${sign}⚡${formatDollarNumber(value)} energy`;
	}

	const amount = getBigIntArg(args, 'amount');
	if (amount === undefined) return undefined;

	const sign = energySign({ skillKey, amount });
	const value = amount < 0n ? -amount : amount;

	return `${sign}⚡${asDollars({ bigInt: value })} energy`;
}

function energySign(args: { skillKey: string; amount: number | bigint }) {
	//
	if (typeof args.amount === 'bigint') {
		return args.amount < 0n ? '-' : '+';
	}

	if (args.amount < 0) return '-';
	return '+';
}

function formatDollarNumber(dollars: number) {
	//
	if (dollars < 1) return dollars.toFixed(2);
	return String(dollars);
}

function getNumberArg(args: Record<string, unknown>, key: string) {
	//
	const value = args[key];
	return typeof value === 'number' ? value : undefined;
}

function getBigIntArg(args: Record<string, unknown>, key: string) {
	//
	const value = args[key];
	return typeof value === 'bigint' ? value : undefined;
}

function getStringArg(args: Record<string, unknown>, key: string) {
	//
	const value = args[key];
	return typeof value === 'string' ? value : undefined;
}

import { ChevronDown, Trash2, X } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { EnqueuedSkill, QueueAwareStripProps } from '../types';

const MAX_VISIBLE_ITEMS = 5;

interface QueueStripProps extends QueueAwareStripProps {
	//
	isCollapsed: boolean;
	onToggleCollapse: () => void;
	onClearQueue: () => void;
}

export function QueueStrip({ queue, onDequeue, isCollapsed, onToggleCollapse, onClearQueue }: QueueStripProps) {
	//
	const count = queue.length;

	const handleClearClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onClearQueue();
		},
		[onClearQueue],
	);

	// single item: render inline without header
	if (count === 1) {
		return (
			<div className="border-t border-border/50 px-4 py-1.5">
				<QueueItem skill={queue[0]} onRemove={onDequeue} />
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
					<ChevronDown
						className={cn('size-3 transition-transform duration-150', isCollapsed && '-rotate-90')}
					/>
					<span>{count} actions queued</span>
				</div>
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
			</button>

			{/* animated content */}
			<AnimatedContent isCollapsed={isCollapsed} shouldScroll={count > MAX_VISIBLE_ITEMS}>
				{queue.map((skill) => (
					<QueueItem key={skill.id} skill={skill} onRemove={onDequeue} />
				))}
			</AnimatedContent>
		</div>
	);
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

function formatSkillLabel(skillKey: string, args: Record<string, unknown>): string {
	//
	switch (skillKey) {
		case 'increaseBudget': {
			const dollars = args['dollars'] as number | undefined;
			if (dollars) {
				return `+$${dollars < 1 ? dollars.toFixed(2) : dollars} budget`;
			}
			return 'Increase budget';
		}
		case 'decreaseBudget': {
			const dollars = args['dollars'] as number | undefined;
			if (dollars) {
				return `-$${dollars < 1 ? dollars.toFixed(2) : dollars} budget`;
			}
			return 'Decrease budget';
		}
		case 'say': {
			const message = args['message'] as string | undefined;
			if (message) {
				const truncated = message.length > 30 ? message.slice(0, 30) + '...' : message;
				return `Say: "${truncated}"`;
			}
			return 'Say';
		}
		default:
			return skillKey;
	}
}

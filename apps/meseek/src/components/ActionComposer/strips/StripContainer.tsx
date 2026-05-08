import type { Doc } from 'convex/_generated/dataModel';
import { useState } from 'react';
import { useComposer } from '~/hooks/useComposer';
import { BudgetStrip } from './BudgetStrip';
import { DraftStrip } from './DraftStrip';
import { QueueStrip } from './QueueStrip';

export function StripContainer({ task }: { task: Doc<'tasks'> }) {
	//
	const { queue, pendingSkills } = useComposer();

	// collapse state for strips (expanded by default)
	const [collapsedStrips, setCollapsedStrips] = useState<Set<string>>(new Set());

	const toggleCollapse = (stripId: string) =>
		setCollapsedStrips((prev) => {
			//
			const next = new Set(prev);

			if (next.has(stripId)) {
				next.delete(stripId);
			} else {
				next.add(stripId);
			}

			return next;
		});

	const hasQueuedOrPendingSkills = queue.length > 0 || pendingSkills.length > 0;

	return (
		<div className="flex flex-col">
			{/*  */}
			{/* draft conflict strip - renders itself only when needed */}
			<DraftStrip />

			{/* budget strip - always visible */}
			<BudgetStrip task={task} />

			{/* queue strip - visible when there are queued or pending skills */}
			{hasQueuedOrPendingSkills && (
				<QueueStrip
					isCollapsed={collapsedStrips.has('queue')}
					onToggleCollapse={() => toggleCollapse('queue')}
				/>
			)}
		</div>
	);
}

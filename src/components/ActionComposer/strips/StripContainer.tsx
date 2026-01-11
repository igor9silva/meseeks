import type { Doc } from 'convex/_generated/dataModel';
import { useState } from 'react';
import type { EnqueuedSkill, SkillToEnqueue } from '../types';
import { BudgetStrip } from './BudgetStrip';
import { QueueStrip } from './QueueStrip';

interface StripContainerProps {
	//
	task: Doc<'tasks'>;
	queue: EnqueuedSkill[];
	onEnqueue: (skill: SkillToEnqueue) => void;
	onDequeue: (id: string) => void;
	onClearQueue: () => void;
}

export function StripContainer({ task, queue, onEnqueue, onDequeue, onClearQueue }: StripContainerProps) {
	//
	// expanded by default (empty set = nothing collapsed)
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

	const hasQueuedSkills = queue.length > 0;

	return (
		<div className="flex flex-col">
			{/* budget strip - always visible */}
			<BudgetStrip task={task} onEnqueue={onEnqueue} />

			{/* queue strip - only visible when there are queued skills */}
			{hasQueuedSkills && (
				<QueueStrip
					task={task}
					queue={queue}
					onEnqueue={onEnqueue}
					onDequeue={onDequeue}
					onClearQueue={onClearQueue}
					isCollapsed={collapsedStrips.has('queue')}
					onToggleCollapse={() => toggleCollapse('queue')}
				/>
			)}
		</div>
	);
}

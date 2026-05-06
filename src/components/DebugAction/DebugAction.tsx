import type { Doc, Id } from 'convex/_generated/dataModel';
import { useEffect, useState } from 'react';
import { cn } from '~/lib/utils';
import { ActionRow } from './ActionRow';

export function DebugAction({
	className,
	action,
	initialRenderDate,
	isAuthorCurrentUser,
	taskId,
}: {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	taskId: Id<'tasks'>;
}) {
	//
	const [isExpanded, setIsExpanded] = useState(false);
	const [isHighlighted, setIsHighlighted] = useState(false);

	useEffect(() => {
		//
		const checkIfHighlighted = () => {
			const hash = window.location.hash;
			const shouldHighlight = hash === `#action-${action._id}`;
			setIsHighlighted(shouldHighlight);

			if (shouldHighlight) {
				setIsExpanded(true);
			}
		};

		checkIfHighlighted();
		window.addEventListener('hashchange', checkIfHighlighted);

		return () => {
			window.removeEventListener('hashchange', checkIfHighlighted);
		};
	}, [action._id]);

	return (
		<div
			className={cn('w-full', className, isHighlighted && 'ring-2 ring-primary ring-offset-2')}
			id={`action-${action._id}`}
		>
			<ActionRow
				action={action}
				isExpanded={isExpanded}
				onToggle={() => setIsExpanded(!isExpanded)}
				isAuthorCurrentUser={isAuthorCurrentUser}
			/>
		</div>
	);
}

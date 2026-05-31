import { Doc, Id } from 'convex/_generated/dataModel';
import type { ReactNode } from 'react';

import index from './actions';
import { ActionPinButton } from './ActionPinButton';
import { GenericAction } from './actions/GenericAction';
import { getActionPinText, useOptionalTaskWorkspace } from '~/hooks/useTaskWorkspace';
import { cn } from '@reactor/ui/lib/utils';

export function Action(props: {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	suppressAnchorId?: boolean;
	taskId: Id<'tasks'>;
}) {
	//
	const workspace = useOptionalTaskWorkspace();
	const canPin = Boolean(workspace && !props.isAuthorCurrentUser && getActionPinText(props.action));
	const isPinned = workspace?.isPinned(props.action._id) ?? false;

	if (
		props.action.skillKey === 'react' &&
		(props.action.status === 'succeeded' || props.action.status === 'skipped')
	) {
		return null;
	}

	if (props.action.skillKey in index) {
		//
		const Component = index[props.action.skillKey as keyof typeof index];
		if (Component === null) return null;

		return (
			<ActionAnchor actionId={props.action._id} className={props.className}>
				{canPin && (
					<ActionPinButton
						isPinned={isPinned}
						onToggle={() => workspace?.togglePin(props.action)}
						className={cn(
							'absolute left-1 top-1 z-10 opacity-0 transition-opacity group-hover/action:opacity-80 hover:!opacity-100',
							isPinned && 'opacity-100',
						)}
					/>
				)}
				<Component {...props} className={undefined} suppressAnchorId />
			</ActionAnchor>
		);
	}

	return (
		<ActionAnchor actionId={props.action._id} className={props.className}>
			{canPin && (
				<ActionPinButton
					isPinned={isPinned}
					onToggle={() => workspace?.togglePin(props.action)}
					className={cn(
						'absolute left-1 top-1 z-10 opacity-0 transition-opacity group-hover/action:opacity-80 hover:!opacity-100',
						isPinned && 'opacity-100',
					)}
				/>
			)}
			<GenericAction {...props} className={undefined} suppressAnchorId />
		</ActionAnchor>
	);
}

function ActionAnchor({
	actionId,
	className,
	children,
}: {
	actionId: Id<'actions'>;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div
			id={`action-${actionId}`}
			className={cn(
				'group/action relative scroll-mt-16 rounded-2xl transition-colors',
				'action-anchor',
				className,
			)}
		>
			{children}
		</div>
	);
}

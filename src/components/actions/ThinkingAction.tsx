import { Doc, Id } from 'convex/_generated/dataModel';

import { Message } from '~/components/ui/message';
import { TextShimmer } from '~/components/ui/text-shimmer';
import { GenericAction } from './GenericAction';

export function ThinkingAction({
	className, //
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
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	const hiddenStatuses = ['enqueued', 'succeeded', 'skipped'];
	if (hiddenStatuses.includes(action.status)) return null;

	if (action.status === 'running') {
		return (
			<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
				<TextShimmer text="Thinking..." />
			</Message>
		);
	}

	return (
		<GenericAction
			action={action}
			initialRenderDate={initialRenderDate}
			isAuthorCurrentUser={isAuthorCurrentUser}
			taskId={taskId}
			className={className}
		/>
	);
}

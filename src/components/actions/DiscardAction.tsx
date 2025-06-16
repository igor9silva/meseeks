import { Doc, Id } from 'convex/_generated/dataModel';
import { GenericAction } from '~/components/actions/GenericAction';

import { SimpleMessage } from '~/components/ui/message';

export function DiscardAction({
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

	if (action.status === 'pending authorization') {
		return (
			<GenericAction
				action={action}
				isAuthorCurrentUser={isAuthorCurrentUser}
				initialRenderDate={initialRenderDate}
				taskId={taskId}
			/>
		);
	}

	return <SimpleMessage text={`Discarded task 🗑️`} isAuthorCurrentUser={isAuthorCurrentUser} />;
}

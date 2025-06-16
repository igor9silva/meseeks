import { Doc, Id } from 'convex/_generated/dataModel';
import { useMemo } from 'react';

import { SimpleMessage } from '~/components/ui/message';

export function DoneAction({
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

	const message = useMemo(() => {
		//
		if (typeof action.args['message'] === 'string') {
			return action.args['message'];
		}

		return 'done';
	}, [action.args['message']]);

	return (
		<SimpleMessage
			text={`${action.args['reason'] === 'blocked' ? '🆘' : '☑︎'} ${message}`}
			isAuthorCurrentUser={isAuthorCurrentUser}
		/>
	);
}

import { useMemo } from 'react';

import { ActionComponentProps } from '~/components/actions';
import { SimpleMessage } from '~/components/ui/message';

export function DoneAction(props: ActionComponentProps) {
	//
	// const isNew = useIsNew(action._creationTime, initialRenderDate);
	const { action, isAuthorCurrentUser, initialRenderDate, taskId } = props;

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

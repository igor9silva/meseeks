import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';

import { SimpleMessage } from '~/components/ui/message';

export function DiscardAction(props: ActionComponentProps) {
	//
	// const isNew = useIsNew(action._creationTime, initialRenderDate);
	const { action, isAuthorCurrentUser, initialRenderDate, taskId } = props;

	if (action.status === 'blocked') {
		return (
			<GenericAction
				action={action}
				isAuthorCurrentUser={isAuthorCurrentUser}
				initialRenderDate={initialRenderDate}
				taskId={taskId}
			/>
		);
	}

	return <SimpleMessage text={`Discarded this task 🗑️`} isAuthorCurrentUser={isAuthorCurrentUser} />;
}

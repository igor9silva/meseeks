import { ActionComponentProps } from '~/components/actions';
import { SimpleMessage } from '~/components/ui/message';

export function DoneAction(props: ActionComponentProps) {
	//
	// const isNew = useIsNew(action._creationTime, initialRenderDate);
	const { action, isAuthorCurrentUser } = props;

	if (action.status !== 'succeeded') return null;

	const message = typeof action.args['message'] === 'string' ? action.args['message'] : 'done';

	return (
		<SimpleMessage
			text={`${action.args['reason'] === 'blocked' ? '🆘' : '☑︎'} ${message}`}
			isAuthorCurrentUser={isAuthorCurrentUser}
		/>
	);
}

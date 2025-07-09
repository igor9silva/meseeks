import { ActionComponentProps } from '~/components/actions';

import { GenericAction } from '~/components/actions/GenericAction';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';

export function UpdateInstructionsAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
			return null;

		case 'pending authorization':
			return <GenericAction {...props} />;

		case 'failed':
			return (
				<FailedMessage
					text={`🚫 Failed to update instructions`}
					error={action.result.text ?? ''}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return (
				<SimpleMessage
					running
					text={`✍️ Updating task instructions`}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			return <SimpleMessage text={`Updated task instructions.`} isAuthorCurrentUser={isAuthorCurrentUser} />;
	}
}

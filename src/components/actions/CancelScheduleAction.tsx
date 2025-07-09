import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';

import { FailedMessage, SimpleMessage } from '~/components/ui/message';

export function CancelScheduleAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;

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
					text={`🚫 Failed to cancel schedule`}
					error={action.result.text ?? ''}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return <SimpleMessage running text={`📆 Canceling schedule`} isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			//
			const message = action.result.text || 'Schedule canceled successfully';

			return <SimpleMessage text={message} isAuthorCurrentUser={isAuthorCurrentUser} />;
	}
}

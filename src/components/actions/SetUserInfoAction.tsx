import { ActionComponentProps } from '~/components/actions';

import { GenericAction } from '~/components/actions/GenericAction';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';

export function SetUserInfoAction(props: ActionComponentProps) {
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
					text="🚫 Failed to update user information"
					error={action.result?.text ?? ''}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return (
				<SimpleMessage
					running
					text="✍️ Updating user information..."
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			return <SimpleMessage text="✅ User information updated" isAuthorCurrentUser={isAuthorCurrentUser} />;
	}
}

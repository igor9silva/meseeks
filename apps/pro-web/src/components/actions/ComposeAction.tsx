import { ActionComponentProps } from '~/components/actions';

import { GenericAction } from '~/components/actions/GenericAction';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';

export function ComposeAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
			return null;

		case 'blocked':
			return <GenericAction {...props} />;

		case 'failed':
			return (
				<FailedMessage
					text={`Failed to compose`}
					error={action.result.text ?? ''}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return <SimpleMessage running text={`Composing ✍️`} isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			return null;
	}
}

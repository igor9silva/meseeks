import { Doc, Id } from 'convex/_generated/dataModel';
import { GenericAction } from '~/components/actions/GenericAction';

import { FailedMessage, SimpleMessage } from '~/components/ui/message';

export function CancelScheduleAction(props: {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	taskId: Id<'tasks'>;
}) {
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

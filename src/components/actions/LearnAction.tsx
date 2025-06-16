import { Doc, Id } from 'convex/_generated/dataModel';

import { GenericAction } from '~/components/actions/GenericAction';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';

export function LearnAction(props: {
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
			return <Error action={action} isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'running':
			return <SimpleMessage running text={`📖 Learning...`} isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			switch (action.skillKey) {
				case 'createSkill':
					return <SimpleMessage text={`📖 Learned skill`} isAuthorCurrentUser={isAuthorCurrentUser} />;
				case 'updateSkill':
					return <SimpleMessage text={`📖 Updated known skill`} isAuthorCurrentUser={isAuthorCurrentUser} />;
				default:
					return null;
			}
	}
}

function Error({ action, isAuthorCurrentUser }: { action: Doc<'actions'>; isAuthorCurrentUser: boolean }) {
	return (
		<FailedMessage
			text={`🚫 Failed to learn`}
			error={action.result?.text ?? ''}
			isAuthorCurrentUser={isAuthorCurrentUser}
		/>
	);
}

import { Doc, Id } from 'convex/_generated/dataModel';
import { cn } from '~/lib/utils';

import { GenericAction } from '~/components/actions/GenericAction';
import { Message, MessageContent } from '~/components/ui/message';

export function RequestBudgetAction(props: {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	taskId: Id<'tasks'>;
}) {
	const { className, action, isAuthorCurrentUser } = props;
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
		case 'running':
			return null;

		case 'failed': // should never
		case 'pending authorization':
			return <GenericAction {...props} />;
	}

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
			<MessageContent
				isMDX={true}
				shouldRenderComponents={true}
				text={action.result?.text ?? 'request budget'}
				className={cn({
					'bg-primary text-primary-foreground p-2': isAuthorCurrentUser,
				})}
			/>
		</Message>
	);
}

import { cn } from '~/lib/utils';

import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { Message, MessageContent } from '~/components/ui/message';

export function RequestBudgetAction(props: ActionComponentProps) {
	//
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

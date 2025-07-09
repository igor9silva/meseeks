import { ActionComponentProps } from '~/components/actions';
import { Message } from '~/components/ui/message';
import { TextShimmer } from '~/components/ui/text-shimmer';

import { GenericAction } from './GenericAction';

export function ThinkingAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	const hiddenStatuses = ['enqueued', 'succeeded', 'skipped'];
	if (hiddenStatuses.includes(action.status)) return null;

	if (action.status === 'running') {
		return (
			<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
				<TextShimmer text="Thinking..." />
			</Message>
		);
	}

	return <GenericAction {...props} />;
}

import { ActionComponentProps } from '~/components/actions';
import { Message } from '~/components/ui/message';
import { TextShimmer } from '@pro/ui/text-shimmer';

import { GenericAction } from './GenericAction';
import { SayAction } from './SayAction';

export function ThinkingAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	const hiddenStatuses = ['enqueued', 'skipped'];
	if (hiddenStatuses.includes(action.status)) return null;

	if (action.status === 'running') {
		return (
			<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
				<TextShimmer text="Thinking..." />
			</Message>
		);
	}

	if (action.status === 'succeeded') {
		return <SayAction {...props} contentKey="result" />;
	}

	return <GenericAction {...props} />;
}

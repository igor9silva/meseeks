import { ActionComponentProps } from '~/components/actions';

import { SimpleMessage } from '~/components/ui/message';

export function ResolveAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	return <SimpleMessage text={`Marked as resolved ☑️`} isAuthorCurrentUser={isAuthorCurrentUser} />;
}

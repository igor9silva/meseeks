import { ActionComponentProps } from '~/components/actions';
import { SimpleMessage } from '~/components/ui/message';

export function MathAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;

	return <SimpleMessage text={action.result?.text ?? ''} isAuthorCurrentUser={isAuthorCurrentUser} />;
}

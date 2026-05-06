import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { SimpleMessage } from '~/components/ui/message';

export function GetSkillDetailsAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
			return null;

		case 'blocked':
		case 'failed':
			return <GenericAction {...props} />;

		case 'running':
			return (
				<SimpleMessage
					running
					text="🔍 Retrieving skill details..."
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			//
			const skillKey = action.args?.['skillKey'] as string;

			return (
				<SimpleMessage
					text={`Retrieved '${skillKey}' skill details.`}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);
	}
}

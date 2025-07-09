import { asDollars } from 'convex/lib/money';

import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';

export function IncreaseBudgetAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

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
					text={`🚫 ${action.result.text ?? 'Failed to increase budget'}`}
					error={action.result.text ?? ''}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return <SimpleMessage running text={`💰 Increasing budget`} isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			//
			const amount = action.args['amount'];

			if (typeof amount !== 'bigint') {
				console.warn('IncreaseBudgetAction: amount is not a bigint', action);
				return <SimpleMessage text={`Budget increased.`} isAuthorCurrentUser={isAuthorCurrentUser} />;
			}

			return (
				<SimpleMessage
					text={`💰 Budget increased by ${asDollars({ bigInt: amount })}`}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);
	}
}

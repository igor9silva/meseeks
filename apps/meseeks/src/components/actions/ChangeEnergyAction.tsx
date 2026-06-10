import { asDollars } from 'lib/money';

import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';

export function ChangeEnergyAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
		case 'interrupted':
			return null;

		case 'pending authorization':
			return <GenericAction {...props} />;

		case 'failed': {
			const errorText = action.result?.text ?? '';

			return (
				<FailedMessage
					text={errorText || 'Failed to change energy'}
					error={errorText}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);
		}

		case 'running':
			return <SimpleMessage running text="Changing energy" isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			//
			const amount = action.args['amount'];

			if (typeof amount !== 'bigint') {
				return <SimpleMessage text="Energy changed." isAuthorCurrentUser={isAuthorCurrentUser} />;
			}

			return <SimpleMessage text={formatEnergyChange(amount)} isAuthorCurrentUser={isAuthorCurrentUser} />;
	}
}

function formatEnergyChange(amount: bigint) {
	//
	if (amount < 0n) return `Removed ${asDollars({ bigInt: -amount })} energy`;
	if (amount > 0n) return `Added ${asDollars({ bigInt: amount })} energy`;

	return 'Energy unchanged.';
}

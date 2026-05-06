import { cn } from '~/lib/utils';

import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { Message, MessageContent } from '~/components/ui/message';

export function RequestBudgetAction(props: ActionComponentProps) {
	//
	const { className, action, isAuthorCurrentUser } = props;
	const shouldShowBudgetBeggarMeme = shouldShowBudgetBeggar(action._id);
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
		case 'running':
			return null;

		case 'failed': // should never
		case 'blocked':
			return <GenericAction {...props} />;
	}

	const content = (
		<MessageContent
			isMDX={true}
			shouldRenderComponents={true}
			text={action.result?.text ?? 'request energy'}
			className={cn({
				'bg-primary text-primary-foreground p-2': isAuthorCurrentUser,
			})}
		/>
	);

	if (!shouldShowBudgetBeggarMeme) {
		return (
			<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
				{content}
			</Message>
		);
	}

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
			<div
				className={cn('inline-flex w-fit max-w-full items-center gap-1 overflow-visible', {
					'flex-row-reverse': isAuthorCurrentUser,
				})}
			>
				{content}
				<img
					src="/static/budget-beggar.png"
					alt=""
					aria-hidden="true"
					className="pointer-events-none h-12 w-auto shrink-0 select-none rounded-sm opacity-60"
				/>
			</div>
		</Message>
	);
}

function shouldShowBudgetBeggar(actionId: string) {
	//
	// derive from the action id to avoid render-time random and hydration mismatches
	const hash = Array.from(actionId).reduce((currentHash, character) => {
		return (currentHash * 31 + character.charCodeAt(0)) % 9973;
	}, 0);

	return hash % 10 === 0;
}

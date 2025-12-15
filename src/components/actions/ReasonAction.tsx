import { ActionComponentProps } from '~/components/actions';
import { ThinkingAction } from '~/components/actions/ThinkingAction';

import { Message, MessageContent } from '~/components/ui/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '~/components/ui/reasoning';

export function ReasonAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;

	if (action.status === 'running') return <ThinkingAction {...props} />;
	if (action.status !== 'succeeded') return null;

	if (!action.result.text) console.warn('succeeded reason action with no text', action);

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
			<Reasoning>
				<ReasoningTrigger className="text-sm text-muted-foreground">💡 Reasoned</ReasoningTrigger>
				<ReasoningContent>
					<MessageContent
						text={action.result?.text ?? ''}
						className="text-muted-foreground overflow-x-auto text-xs"
						isMDX
					/>
				</ReasoningContent>
			</Reasoning>
		</Message>
	);
}

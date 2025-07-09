import { cn } from '~/lib/utils';

import { ActionComponentProps } from '~/components/actions';
import { CopyButton } from '~/components/CopyButton';
import { Message, MessageContent } from '~/components/ui/message';

export function SayAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser} className={cn(className, 'relative group')}>
			<MessageContent
				isMDX={true}
				text={action.args['message']}
				className={cn({
					'bg-primary text-primary-foreground p-2': isAuthorCurrentUser,
					'bg-secondary text-secondary-foreground p-2': !isAuthorCurrentUser,
				})}
			/>
			<CopyButton
				textToCopy={action.args['message']}
				className="absolute top-1 right-1 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
			/>
		</Message>
	);
}

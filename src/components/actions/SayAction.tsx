import { Doc, Id } from 'convex/_generated/dataModel';
import { cn } from '~/lib/utils';

import { Message, MessageContent } from '~/components/ui/message';

export function SayAction({
	className, //
	action,
	initialRenderDate,
	isAuthorCurrentUser,
	taskId,
}: {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	taskId: Id<'tasks'>;
}) {
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
			<MessageContent
				isMDX={true}
				text={action.args['message']}
				className={cn({
					'bg-primary text-primary-foreground p-2': isAuthorCurrentUser,
					'bg-secondary text-secondary-foreground p-2': !isAuthorCurrentUser,
				})}
			/>
		</Message>
	);
}

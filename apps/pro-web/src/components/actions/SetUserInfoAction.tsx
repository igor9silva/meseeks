import { ChevronDown, User } from 'lucide-react';
import { useState } from 'react';

import { ActionComponentProps } from '~/components/actions';

import { GenericAction } from '~/components/actions/GenericAction';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@reactor/ui/collapsible';
import { FailedMessage, Message, SimpleMessage } from '~/components/ui/message';

export function SetUserInfoAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
			return null;

		case 'blocked':
			return <GenericAction {...props} />;

		case 'failed':
			return (
				<FailedMessage
					text="Failed to update user information"
					error={action.result?.text ?? ''}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return (
				<SimpleMessage
					running
					text="✍️ Updating user information..."
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			return <Success {...props} />;
	}
}

function Success(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	const [isOpen, setIsOpen] = useState(false);

	const userInfo = (action.args['userInfo'] as string) ?? '';

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground">
					<User className="size-4" />
					<span>User information updated</span>
					<div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
						<ChevronDown className="size-4" />
					</div>
				</CollapsibleTrigger>
				<CollapsibleContent className="my-4">
					<div className="border border-border bg-background rounded-md p-3 max-h-64 overflow-y-auto">
						<pre className="whitespace-pre-wrap text-sm font-mono text-foreground">
							{userInfo || '(no user info provided)'}
						</pre>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</Message>
	);
}

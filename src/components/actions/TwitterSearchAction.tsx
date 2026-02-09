import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { TweetCard } from '~/components/TweetCard';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { FailedMessage, Message, MessageContent, SimpleMessage } from '~/components/ui/message';

export function TwitterSearchAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
			return null;

		case 'pending authorization':
			return <GenericAction {...props} />;

		case 'failed':
			return <Error {...props} />;

		case 'running':
			return (
				<SimpleMessage
					running
					text={`🐦 Searching Twitter for "${action.args['query']}"`}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			return <Success {...props} />;
	}
}

function Error({ action, isAuthorCurrentUser }: ActionComponentProps) {
	return (
		<FailedMessage
			text={`Failed to search Twitter for "${action.args['query']}"`}
			error={action.result?.text ?? ''}
			isAuthorCurrentUser={isAuthorCurrentUser}
		/>
	);
}

function Success(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	//
	let data;
	try {
		data = JSON.parse(action.result?.text ?? '{}');
	} catch {
		console.warn('Invalid (or no) result found succeeded action', action._id);
		return <Error {...props} />;
	}

	const results = data.results || [];

	if (!results.length) {
		return (
			<SimpleMessage
				text={`🐦 No tweets found for "${action.args['query']}"`}
				isAuthorCurrentUser={isAuthorCurrentUser}
			/>
		);
	}

	const [isOpen, setIsOpen] = useState(false);

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger className="flex gap-0 items-center">
					<MessageContent
						className="text-sm text-muted-foreground text-left"
						text={`🐦 Found ${results.length} tweets for "${action.args['query']}"`}
					/>
					<Button
						variant="link"
						size="sm"
						className="text-muted-foreground p-1"
						onClick={() => setIsOpen(!isOpen)}
					>
						{isOpen ? <ChevronUp /> : <ChevronDown />}
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent className="">
					<div className="mt-2 overflow-x-auto overflow-y-hidden">
						<div className="flex gap-3 pb-4">
							{results.map((tweet: any) => (
								<TweetCard key={tweet.tweet_id} tweet={tweet} />
							))}
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</Message>
	);
}

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod/v3';
import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { TweetCard, TweetCardSchema } from '~/components/TweetCard';
import { Button } from '@reactor/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@reactor/ui/collapsible';
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

const TwitterSearchResultSchema = z.preprocess(
	(value) => (Array.isArray(value) ? { results: value } : value),
	z.object({
		results: z.preprocess((value) => (Array.isArray(value) ? value : []), z.array(TweetCardSchema)),
	}),
);

function Success(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	const [isOpen, setIsOpen] = useState(false);
	//
	const response = parseTwitterSearchResult(action.result?.text);
	if (!response.success) {
		console.warn('Invalid (or no) result found succeeded action', action._id);
		return <Error {...props} />;
	}

	const { results } = response.data;

	if (!results.length) {
		return (
			<SimpleMessage
				text={`🐦 No tweets found for "${action.args['query']}"`}
				isAuthorCurrentUser={isAuthorCurrentUser}
			/>
		);
	}

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
							{results.map((tweet) => (
								<TweetCard key={tweet.tweet_id} tweet={tweet} />
							))}
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</Message>
	);
}

function parseTwitterSearchResult(resultText: string | undefined) {
	//
	try {
		return TwitterSearchResultSchema.safeParse(JSON.parse(resultText ?? '{}'));
	} catch {
		return TwitterSearchResultSchema.safeParse(null);
	}
}

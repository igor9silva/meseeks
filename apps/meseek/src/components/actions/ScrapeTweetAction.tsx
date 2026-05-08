import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { TweetCard } from '~/components/TweetCard';
import { FailedMessage, Message, SimpleMessage } from '~/components/ui/message';
import { cn } from '@reactor/ui/lib/utils';

export function ScrapeTweetAction(props: ActionComponentProps) {
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
			return <SimpleMessage running text={`🐦 Scraping tweet...`} isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			return <Success {...props} />;
	}
}

function Error({ action, isAuthorCurrentUser }: ActionComponentProps) {
	return (
		<FailedMessage
			text={`Failed to scrape tweet`}
			error={action.result?.text ?? ''}
			isAuthorCurrentUser={isAuthorCurrentUser}
		/>
	);
}

function Success(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	//
	let tweet;
	try {
		tweet = JSON.parse(action.result?.text ?? '{}');
	} catch {
		console.warn('Invalid (or no) result found for succeeded action', action._id);
		return <Error {...props} />;
	}

	if (!tweet || !tweet.tweet_id) {
		return <SimpleMessage text={`🐦 No tweet data found`} isAuthorCurrentUser={isAuthorCurrentUser} />;
	}

	return (
		<Message
			isAuthorCurrentUser={isAuthorCurrentUser}
			className={cn(className, 'flex flex-col gap-0.5 max-h-[30rem]')}
		>
			<TweetCard tweet={tweet} fixedHeight={false} />
		</Message>
	);
}

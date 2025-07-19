import { Calendar, ChevronDown, ChevronUp, Heart, MessageCircle, Repeat2, User, Verified } from 'lucide-react';
import { useState } from 'react';
import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { FailedMessage, Message, MessageContent, SimpleMessage } from '~/components/ui/message';
import { cn } from '~/lib/utils';

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
			text={`🚫 Failed to search Twitter for "${action.args['query']}"`}
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

function TweetCard({ tweet }: { tweet: any }) {
	//
	const hasMedia = Boolean(tweet.media_url?.length || tweet.video_url?.length);
	const tweetUrl = tweet.expanded_url || `https://x.com/${tweet.user.username}/status/${tweet.tweet_id}`;

	return (
		<a
			href={tweetUrl}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				'flex flex-col min-w-80 max-w-80 max-h-96 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
				'cursor-pointer overflow-hidden flex-shrink-0',
			)}
		>
			<div className="flex flex-col h-full">
				{/* user info */}
				<div className="flex items-start gap-3 mb-3 flex-shrink-0">
					<Avatar className="h-10 w-10">
						<AvatarImage src={tweet.user.profile_pic_url} alt={tweet.user.name} />
						<AvatarFallback>
							<User className="h-5 w-5" />
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1">
							<span className="font-semibold text-sm truncate">{tweet.user.name}</span>
							{tweet.user.is_blue_verified && (
								<div className="relative">
									<Verified className="h-4 w-4 text-blue-500 fill-blue-500" />
									<svg
										className="absolute inset-0 h-4 w-4 text-white"
										viewBox="0 0 24 24"
										fill="none"
									>
										<path
											d="M9 12l2 2 4-4"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</div>
							)}
						</div>
						<div className="text-xs text-muted-foreground">@{tweet.user.username}</div>
					</div>
					<div className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
						<Calendar className="h-3 w-3" />
						{formatDate(tweet.creation_date)}
					</div>
				</div>

				{/* tweet content - scrollable if needed */}
				<div className="text-sm mb-3 overflow-y-auto flex-1 break-words whitespace-pre-wrap">
					{renderTweetText(tweet.text)}
				</div>

				{/* media preview */}
				{hasMedia && (
					<div className="mb-3 -mx-4 flex-shrink-0">
						{tweet.media_url?.length > 0 && (
							<img src={tweet.media_url[0]} alt="Tweet media" className="w-full h-32 object-cover" />
						)}
						{tweet.video_url?.length > 0 && (
							<div className="relative">
								<video src={tweet.video_url[0].url} className="w-full h-32 object-cover" muted />
								<div className="absolute inset-0 flex items-center justify-center bg-black/20">
									<div className="bg-black/60 rounded-full p-2">
										<span className="text-white text-xs">Video</span>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{/* quoted tweet preview */}
				{tweet.quoted_status && (
					<div className="mb-3 p-3 rounded-xl border bg-muted/30 flex-shrink-0">
						<div className="flex items-center gap-2 mb-1">
							<span className="text-xs font-semibold">{tweet.quoted_status.user.name}</span>
							<span className="text-xs text-muted-foreground">@{tweet.quoted_status.user.username}</span>
						</div>
						<div className="text-xs line-clamp-2">{tweet.quoted_status.text}</div>
					</div>
				)}

				{/* engagement stats */}
				<div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-2 border-t flex-shrink-0">
					<div className="flex items-center gap-1">
						<MessageCircle className="h-3 w-3" />
						{formatCount(tweet.reply_count)}
					</div>
					<div className="flex items-center gap-1">
						<Repeat2 className="h-3 w-3" />
						{formatCount(tweet.retweet_count)}
					</div>
					<div className="flex items-center gap-1">
						<Heart className="h-3 w-3" />
						{formatCount(tweet.favorite_count)}
					</div>
					{tweet.views !== null && <div className="ml-auto">{formatCount(tweet.views)} views</div>}
				</div>
			</div>
		</a>
	);
}

function formatCount(count: number): string {
	//
	if (count >= 1000000) {
		return `${(count / 1000000).toFixed(1)}M`;
	}
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1)}K`;
	}
	return count.toString();
}

function formatDate(dateString: string): string {
	//
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function renderTweetText(text: string): React.ReactNode {
	//
	// split by @mentions and create spans
	const parts = text.split(/(@\w+)/g);

	return parts.map((part, index) => {
		if (part.startsWith('@')) {
			return (
				<span key={index} className="text-blue-500 hover:underline">
					{part}
				</span>
			);
		}
		return part;
	});
}

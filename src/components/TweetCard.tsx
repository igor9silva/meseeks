import { Calendar, Heart, MessageCircle, Play, Repeat2, User, Verified } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { cn } from '~/lib/utils';

interface TweetCardProps {
	tweet: any;
	className?: string;
	fixedHeight?: boolean;
}

export function TweetCard({ tweet, className, fixedHeight = true }: TweetCardProps) {
	//
	const hasMedia = Boolean(tweet.media_url?.length || tweet.video_url?.length);
	const hasQuotedTweet = Boolean(tweet.quoted_status);
	const tweetUrl = tweet.expanded_url || `https://x.com/${tweet.user.username}/status/${tweet.tweet_id}`;

	return (
		<a
			href={tweetUrl}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				'flex flex-col min-w-80 max-w-80 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
				'cursor-pointer overflow-auto flex-shrink-0',
				fixedHeight ? 'h-96' : 'min-h-0',
				className,
			)}
		>
			<div className={cn('flex flex-col', fixedHeight ? 'h-full' : 'min-h-0')}>
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

				{/* content area - flexible to fill remaining space above stats */}
				<div className={cn('flex flex-col min-h-0 mb-3', fixedHeight ? 'flex-1' : '')}>
					{/* tweet content */}
					<div
						className={cn(
							'text-sm mb-3 break-words whitespace-pre-wrap',
							fixedHeight ? 'overflow-y-auto' : '',
						)}
					>
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
											<Play className="h-4 w-4 text-white" />
										</div>
									</div>
								</div>
							)}
						</div>
					)}

					{/* quoted tweet preview */}
					{hasQuotedTweet && (
						<div className="p-3 rounded-xl border bg-muted/30 flex-shrink-0">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-xs font-semibold">{tweet.quoted_status.user.name}</span>
								<span className="text-xs text-muted-foreground">
									@{tweet.quoted_status.user.username}
								</span>
							</div>
							<div className="text-xs line-clamp-2">{tweet.quoted_status.text}</div>
						</div>
					)}
				</div>

				{/* engagement stats - always fixed at bottom */}
				<div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t flex-shrink-0">
					<div className="flex items-center gap-1">
						<MessageCircle className="h-3 w-3" />
						{formatCount(tweet.reply_count || 0)}
					</div>
					<div className="flex items-center gap-1">
						<Repeat2 className="h-3 w-3" />
						{formatCount(tweet.retweet_count || 0)}
					</div>
					<div className="flex items-center gap-1">
						<Heart className="h-3 w-3" />
						{formatCount(tweet.favorite_count || 0)}
					</div>
					{tweet.views !== null && tweet.views !== undefined && (
						<div className="ml-auto">{formatCount(tweet.views)} views</div>
					)}
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

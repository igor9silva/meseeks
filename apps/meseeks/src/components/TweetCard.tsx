import { Calendar, Heart, MessageCircle, Play, Repeat2, User, Verified } from 'lucide-react';
import type { ReactNode } from 'react';
import { z } from 'zod/v3';
import { isRecord, isString } from 'lib/guards';
import { Avatar, AvatarFallback, AvatarImage } from '@pro/ui/avatar';
import { cn } from '@pro/ui/lib/utils';

const optionalStringSchema = z
	.preprocess(
		(value) => (value === null ? undefined : value),
		z.union([z.string(), z.number(), z.boolean()]).transform(String).optional(),
	)
	.catch(undefined);

const optionalBooleanSchema = z
	.preprocess((value) => {
		if (value === null) return undefined;
		if (value === 'true') return true;
		if (value === 'false') return false;
		return value;
	}, z.boolean().optional())
	.catch(undefined);

const optionalNumberSchema = z
	.preprocess((value) => {
		if (value === null || value === '') return undefined;
		return value;
	}, z.coerce.number().optional())
	.catch(undefined);

const TweetUserSchema = z.preprocess(
	(value) => (isRecord(value) ? value : {}),
	z
		.object({
			profile_pic_url: optionalStringSchema,
			profile_image_url_https: optionalStringSchema,
			name: optionalStringSchema,
			username: optionalStringSchema,
			screen_name: optionalStringSchema,
			is_blue_verified: optionalBooleanSchema,
			verified: optionalBooleanSchema,
		})
		.passthrough()
		.transform((user) => ({
			profile_pic_url: user.profile_pic_url ?? user.profile_image_url_https,
			name: user.name ?? user.username ?? user.screen_name,
			username: user.username ?? user.screen_name,
			is_blue_verified: user.is_blue_verified ?? user.verified,
		})),
);

const TweetVideoItemSchema = z
	.union([
		z.string().transform((url) => ({ url })),
		z
			.object({
				url: optionalStringSchema,
				video_url: optionalStringSchema,
			})
			.passthrough()
			.transform((video) => ({ url: video.url ?? video.video_url })),
	])
	.catch({ url: undefined });

const TweetVideoSchema = z.preprocess(
	(value) => (Array.isArray(value) ? value : typeof value === 'string' ? [value] : []),
	z.array(TweetVideoItemSchema).transform((videos) => videos.filter(hasVideoUrl)),
);

const TweetMediaItemSchema = z
	.union([
		z.string(),
		z
			.object({
				url: optionalStringSchema,
				media_url: optionalStringSchema,
				media_url_https: optionalStringSchema,
				preview_image_url: optionalStringSchema,
				thumbnail_url: optionalStringSchema,
			})
			.passthrough()
			.transform(
				(media) =>
					media.url ??
					media.media_url ??
					media.media_url_https ??
					media.preview_image_url ??
					media.thumbnail_url,
			),
	])
	.catch(undefined);

const TweetMediaSchema = z.preprocess(
	(value) => (Array.isArray(value) ? value : typeof value === 'string' ? [value] : []),
	z.array(TweetMediaItemSchema).transform((urls) => urls.filter(isString).filter((url) => url.length > 0)),
);

const QuotedTweetSchema = z
	.object({
		user: TweetUserSchema,
		text: optionalStringSchema,
	})
	.passthrough();

export const TweetCardSchema = z
	.object({
		tweet_id: optionalStringSchema.default('unknown'),
		expanded_url: optionalStringSchema,
		creation_date: optionalStringSchema,
		text: optionalStringSchema,
		user: TweetUserSchema,
		media_url: TweetMediaSchema,
		video_url: TweetVideoSchema,
		quoted_status: QuotedTweetSchema.nullable().optional(),
		reply_count: optionalNumberSchema,
		retweet_count: optionalNumberSchema,
		favorite_count: optionalNumberSchema,
		views: optionalNumberSchema,
	})
	.passthrough();

type TweetCardTweet = z.infer<typeof TweetCardSchema>;

interface TweetCardProps {
	tweet: TweetCardTweet;
	className?: string;
	fixedHeight?: boolean;
}

export function TweetCard({ tweet, className, fixedHeight = true }: TweetCardProps) {
	//
	const mediaUrl = tweet.media_url?.[0];
	const videoUrl = tweet.video_url?.find((video) => video.url)?.url;
	const hasMedia = Boolean(mediaUrl || videoUrl);
	const quotedTweet = tweet.quoted_status;
	const username = tweet.user.username ?? 'unknown';
	const userName = tweet.user.name ?? username;
	const tweetUrl = tweet.expanded_url ?? `https://x.com/${username}/status/${tweet.tweet_id}`;

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
						<AvatarImage src={tweet.user.profile_pic_url} alt={userName} />
						<AvatarFallback>
							<User className="h-5 w-5" />
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1">
							<span className="font-semibold text-sm truncate">{userName}</span>
							{tweet.user.is_blue_verified === true && (
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
						<div className="text-xs text-muted-foreground">@{username}</div>
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
						{renderTweetText(tweet.text ?? '')}
					</div>

					{/* media preview */}
					{hasMedia && (
						<div className="mb-3 -mx-4 flex-shrink-0">
							{videoUrl ? (
								<div className="relative">
									<video
										src={videoUrl}
										poster={mediaUrl}
										className="block w-full h-32 object-cover"
										muted
										playsInline
										preload="metadata"
									/>
									<div className="absolute inset-0 flex items-center justify-center bg-black/20">
										<div className="bg-black/60 rounded-full p-2">
											<Play className="h-4 w-4 text-white" />
										</div>
									</div>
								</div>
							) : (
								<img src={mediaUrl} alt="Tweet media" className="block w-full h-32 object-cover" />
							)}
						</div>
					)}

					{/* quoted tweet preview */}
					{quotedTweet && (
						<div className="p-3 rounded-xl border bg-muted/30 flex-shrink-0">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-xs font-semibold">
									{quotedTweet.user?.name ?? quotedTweet.user?.username ?? 'unknown'}
								</span>
								<span className="text-xs text-muted-foreground">
									@{quotedTweet.user?.username ?? 'unknown'}
								</span>
							</div>
							<div className="text-xs line-clamp-2">{quotedTweet.text}</div>
						</div>
					)}
				</div>

				{/* engagement stats - always fixed at bottom */}
				<div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t flex-shrink-0">
					<div className="flex items-center gap-1">
						<MessageCircle className="h-3 w-3" />
						{formatCount(tweet.reply_count ?? 0)}
					</div>
					<div className="flex items-center gap-1">
						<Repeat2 className="h-3 w-3" />
						{formatCount(tweet.retweet_count ?? 0)}
					</div>
					<div className="flex items-center gap-1">
						<Heart className="h-3 w-3" />
						{formatCount(tweet.favorite_count ?? 0)}
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

function formatDate(dateString: string | undefined): string {
	//
	if (!dateString) return '';

	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return dateString;

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function renderTweetText(text: string): ReactNode {
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

function hasVideoUrl(video: { url?: string }): video is { url: string } {
	//
	return Boolean(video.url);
}

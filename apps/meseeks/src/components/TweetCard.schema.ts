import { z } from 'zod/v3';
import { isRecord, isString } from 'lib/guards';

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

function hasVideoUrl(video: { url?: string }) {
	return typeof video.url === 'string' && video.url.length > 0;
}

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

export type TweetCardTweet = z.infer<typeof TweetCardSchema>;

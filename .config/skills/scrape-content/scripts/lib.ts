import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { API_KEYS } from '../../../../data/skills/config';

const RAPID_API_KEY = API_KEYS.RAPID_API;

export interface TweetEntry {
	url: string;
	tweetId: string;
	comment?: string;
}

export function extractTweetId(url: string): string | null {
	//
	const match = url.match(/\/(\d+)(?:\?|$)/);
	return match ? match[1] : null;
}

export function isTwitterUrl(line: string): boolean {
	//
	return line.startsWith('https://x.com/') || line.startsWith('https://twitter.com/');
}

export async function scrapeTweet(id: string): Promise<unknown> {
	//
	const response = await fetch(`https://twitter154.p.rapidapi.com/tweet/details?tweet_id=${id}`, {
		headers: { 'x-rapidapi-key': RAPID_API_KEY },
	});

	if (!response.ok) {
		throw new Error(`Failed to scrape tweet ${id}: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

function formatDate(dateStr: string): string {
	//
	const date = new Date(dateStr);
	const humanDate = date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	return `${humanDate} (${date.toISOString()})`;
}

interface TweetShape {
	detail?: string;
	creation_date?: string;
	text?: string;
	user?: { username?: string; name?: string };
	favorite_count?: number;
	retweet_count?: number;
	reply_count?: number;
	views?: number;
	quote_count?: number;
	bookmark_count?: number;
}

export function toMarkdown(data: unknown, url: string, comment?: string): string {
	//
	const tweet = data as TweetShape;
	const lines: string[] = [];

	lines.push(url);
	if (tweet.creation_date) lines.push(formatDate(tweet.creation_date));
	lines.push('');
	lines.push('---');
	lines.push('');

	if (tweet.detail) {
		lines.push('Tweet not found');
		if (comment) {
			lines.push('');
			lines.push(comment);
		}
	} else {
		if (tweet.text) lines.push(tweet.text);

		if (comment) {
			lines.push('');
			lines.push(comment);
		}

		if (tweet.user) {
			lines.push('');
			const parts: string[] = [];
			if (tweet.user.username) {
				parts.push(`[@${tweet.user.username}](https://x.com/${tweet.user.username})`);
			}
			if (tweet.user.name) parts.push(tweet.user.name);
			if (parts.length > 0) lines.push(parts.join(' '));
		}

		const metrics: string[] = [];
		if (tweet.favorite_count !== undefined) metrics.push(`Likes: ${tweet.favorite_count}`);
		if (tweet.retweet_count !== undefined) metrics.push(`Retweets: ${tweet.retweet_count}`);
		if (tweet.reply_count !== undefined) metrics.push(`Replies: ${tweet.reply_count}`);
		if (tweet.views !== undefined) metrics.push(`Views: ${tweet.views}`);
		if (tweet.quote_count && tweet.quote_count > 0) metrics.push(`Quotes: ${tweet.quote_count}`);
		if (tweet.bookmark_count && tweet.bookmark_count > 0) metrics.push(`Bookmarks: ${tweet.bookmark_count}`);
		if (metrics.length > 0) {
			lines.push('');
			lines.push(metrics.join(' | '));
		}
	}

	lines.push('');
	lines.push('---');
	lines.push('');
	lines.push('```json');
	lines.push(JSON.stringify(data, null, 2));
	lines.push('```');

	return lines.join('\n');
}

export function scrapeAndSave(entry: TweetEntry, outputDir: string): Promise<void> {
	//
	return scrapeTweet(entry.tweetId)
		.then((data) => {
			const md = toMarkdown(data, entry.url, entry.comment);
			const outFile = join(outputDir, `${entry.tweetId}.md`);
			writeFileSync(outFile, md, 'utf-8');
			console.log(`✓ Saved to ${outFile}`);
		})
		.catch((error) => {
			console.error(`✗ Error scraping tweet ${entry.tweetId}:`, error);

			const errLines = [entry.url, '', '---', '', 'Error scraping tweet'];
			if (entry.comment) errLines.push('', entry.comment);
			errLines.push('', '---', '', '```json', JSON.stringify({ error: String(error) }, null, 2), '```');

			const outFile = join(outputDir, `${entry.tweetId}.md`);
			writeFileSync(outFile, errLines.join('\n'), 'utf-8');
		});
}

export function parseOutputDirArg(args: string[]): { outputDir: string; remainingArgs: string[] } {
	//
	const idx = args.indexOf('--output-dir');
	if (idx === -1) return { outputDir: join(process.cwd(), 'scraped'), remainingArgs: args };

	const outputDir = resolve(args[idx + 1]);
	const remainingArgs = args.slice();
	remainingArgs.splice(idx, 2);
	return { outputDir, remainingArgs };
}

export function ensureDir(dir: string): void {
	//
	mkdirSync(dir, { recursive: true });
}

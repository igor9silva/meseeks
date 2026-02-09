#!/usr/bin/env bun
// scrape a single tweet and save as markdown
// usage: bun scrape-tweet.ts <url> [comment] [--output-dir <dir>]
//
// examples:
//   bun scrape-tweet.ts "https://x.com/pmarca/status/2010858340088479886?s=12"
//   bun scrape-tweet.ts "https://x.com/pmarca/status/2010858340088479886?s=12" "Revolut pitch deck"
//   bun scrape-tweet.ts "https://x.com/pmarca/status/2010858340088479886?s=12" --output-dir ./scraped

import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

// ── config ──────────────────────────────────────────────────────────
// API key source: data/skills/config.ts (RAPID_API)
// falls back to RAPID_API_KEY env var
const RAPID_API_KEY =
	process.env.RAPID_API_KEY ?? (await loadApiKey());

async function loadApiKey(): Promise<string> {
	//
	try {
		const config = await import('../../../../data/skills/config');
		return config.API_KEYS.RAPID_API;
	} catch {
		console.error('No RAPID_API_KEY env var and could not load data/skills/config.ts');
		process.exit(1);
	}
}

// ── args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

const outputDirIdx = args.indexOf('--output-dir');
let outputDir = join(process.cwd(), 'scraped');

if (outputDirIdx !== -1) {
	outputDir = resolve(args[outputDirIdx + 1]);
	args.splice(outputDirIdx, 2);
}

const tweetUrl = args[0];
const comment = args[1] || undefined;

if (!tweetUrl) {
	console.error('Usage: bun scrape-tweet.ts <url> [comment] [--output-dir <dir>]');
	process.exit(1);
}

function extractTweetId(url: string): string | null {
	const match = url.match(/\/(\d+)(?:\?|$)/);
	return match ? match[1] : null;
}

const tweetId = extractTweetId(tweetUrl);

if (!tweetId) {
	console.error(`Could not extract tweet ID from: ${tweetUrl}`);
	process.exit(1);
}

// ── scrape ──────────────────────────────────────────────────────────

async function scrapeTweet(id: string): Promise<unknown> {
	//
	const response = await fetch(
		`https://twitter154.p.rapidapi.com/tweet/details?tweet_id=${id}`,
		{ headers: { 'x-rapidapi-key': RAPID_API_KEY } },
	);

	if (!response.ok) {
		throw new Error(`Failed to scrape tweet ${id}: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

// ── markdown ────────────────────────────────────────────────────────

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

function toMarkdown(data: unknown, url: string, comment?: string): string {
	//
	const tweet = data as {
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
	};

	const lines: string[] = [];

	// header: link + date
	lines.push(url);
	if (tweet.creation_date) lines.push(formatDate(tweet.creation_date));
	lines.push('');
	lines.push('---');
	lines.push('');

	if (tweet.detail) {
		// tweet not found
		lines.push('Tweet not found');
		if (comment) {
			lines.push('');
			lines.push(comment);
		}
	} else {
		// tweet text
		if (tweet.text) lines.push(tweet.text);

		// user comment (critically important context)
		if (comment) {
			lines.push('');
			lines.push(comment);
		}

		// author: [@username](link) Display Name
		if (tweet.user) {
			lines.push('');
			const parts: string[] = [];
			if (tweet.user.username) {
				parts.push(`[@${tweet.user.username}](https://x.com/${tweet.user.username})`);
			}
			if (tweet.user.name) parts.push(tweet.user.name);
			if (parts.length > 0) lines.push(parts.join(' '));
		}

		// engagement metrics
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

	// raw JSON
	lines.push('');
	lines.push('---');
	lines.push('');
	lines.push('```json');
	lines.push(JSON.stringify(data, null, 2));
	lines.push('```');

	return lines.join('\n');
}

// ── main ────────────────────────────────────────────────────────────

mkdirSync(outputDir, { recursive: true });

console.log(`Scraping tweet: ${tweetId}`);

try {
	const data = await scrapeTweet(tweetId);
	const md = toMarkdown(data, tweetUrl, comment);
	const outFile = join(outputDir, `${tweetId}.md`);
	writeFileSync(outFile, md, 'utf-8');
	console.log(`✓ Saved to ${outFile}`);
} catch (error) {
	console.error(`✗ Error: ${error}`);

	// still produce a file with error info
	const errLines = [tweetUrl, '', '---', '', 'Error scraping tweet'];
	if (comment) errLines.push('', comment);
	errLines.push('', '---', '', '```json', JSON.stringify({ error: String(error) }, null, 2), '```');

	const outFile = join(outputDir, `${tweetId}.md`);
	writeFileSync(outFile, errLines.join('\n'), 'utf-8');
}

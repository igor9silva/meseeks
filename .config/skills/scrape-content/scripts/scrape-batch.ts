#!/usr/bin/env bun
// scrape all tweets from a list file and save as markdown
// usage: bun scrape-batch.ts <input-file> [--output-dir <dir>]
//
// input file format (entries separated by ---):
//   https://x.com/user/status/123
//   optional comment
//   ---
//   https://x.com/user/status/456
//   ---
//
// examples:
//   bun scrape-batch.ts ./to-scrape.txt
//   bun scrape-batch.ts ./to-scrape.txt --output-dir ./scraped

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

// ── config ──────────────────────────────────────────────────────────
const RAPID_API_KEY = process.env.RAPID_API_KEY ?? (await loadApiKey());

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

const inputFile = args[0];

if (!inputFile) {
	console.error('Usage: bun scrape-batch.ts <input-file> [--output-dir <dir>]');
	process.exit(1);
}

// ── parse input ─────────────────────────────────────────────────────

interface TweetEntry {
	url: string;
	tweetId: string;
	comment?: string;
}

function extractTweetId(url: string): string | null {
	const match = url.match(/\/(\d+)(?:\?|$)/);
	return match ? match[1] : null;
}

function isTwitterUrl(line: string): boolean {
	return line.startsWith('https://x.com/') || line.startsWith('https://twitter.com/');
}

const content = readFileSync(resolve(inputFile), 'utf-8');
const lines = content.split('\n');
const entries: TweetEntry[] = [];

let currentUrl: string | null = null;
let currentComment: string[] = [];

function pushEntry() {
	//
	if (!currentUrl) return;
	const tweetId = extractTweetId(currentUrl);
	if (tweetId) {
		entries.push({
			url: currentUrl,
			tweetId,
			comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
		});
	}
}

for (const line of lines) {
	const trimmed = line.trim();

	if (trimmed === '---') {
		pushEntry();
		currentUrl = null;
		currentComment = [];
	} else if (isTwitterUrl(trimmed)) {
		pushEntry();
		currentUrl = trimmed;
		currentComment = [];
	} else if (trimmed && currentUrl) {
		currentComment.push(trimmed);
	}
}

pushEntry(); // last entry

console.log(`Found ${entries.length} tweet entries to scrape`);

// ── scrape ──────────────────────────────────────────────────────────

async function scrapeTweet(id: string): Promise<unknown> {
	//
	const response = await fetch(`https://twitter154.p.rapidapi.com/tweet/details?tweet_id=${id}`, {
		headers: { 'x-rapidapi-key': RAPID_API_KEY },
	});

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

function toMarkdown(data: unknown, entry: TweetEntry): string {
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

	const md: string[] = [];

	// header: link + date
	md.push(entry.url);
	if (tweet.creation_date) md.push(formatDate(tweet.creation_date));
	md.push('');
	md.push('---');
	md.push('');

	if (tweet.detail) {
		md.push('Tweet not found');
		if (entry.comment) {
			md.push('');
			md.push(entry.comment);
		}
	} else {
		if (tweet.text) md.push(tweet.text);

		// user comment (critically important context)
		if (entry.comment) {
			md.push('');
			md.push(entry.comment);
		}

		// author
		if (tweet.user) {
			md.push('');
			const parts: string[] = [];
			if (tweet.user.username) {
				parts.push(`[@${tweet.user.username}](https://x.com/${tweet.user.username})`);
			}
			if (tweet.user.name) parts.push(tweet.user.name);
			if (parts.length > 0) md.push(parts.join(' '));
		}

		// metrics
		const metrics: string[] = [];
		if (tweet.favorite_count !== undefined) metrics.push(`Likes: ${tweet.favorite_count}`);
		if (tweet.retweet_count !== undefined) metrics.push(`Retweets: ${tweet.retweet_count}`);
		if (tweet.reply_count !== undefined) metrics.push(`Replies: ${tweet.reply_count}`);
		if (tweet.views !== undefined) metrics.push(`Views: ${tweet.views}`);
		if (tweet.quote_count && tweet.quote_count > 0) metrics.push(`Quotes: ${tweet.quote_count}`);
		if (tweet.bookmark_count && tweet.bookmark_count > 0) metrics.push(`Bookmarks: ${tweet.bookmark_count}`);
		if (metrics.length > 0) {
			md.push('');
			md.push(metrics.join(' | '));
		}
	}

	// raw JSON
	md.push('');
	md.push('---');
	md.push('');
	md.push('```json');
	md.push(JSON.stringify(data, null, 2));
	md.push('```');

	return md.join('\n');
}

// ── main ────────────────────────────────────────────────────────────

mkdirSync(outputDir, { recursive: true });

for (let i = 0; i < entries.length; i++) {
	const entry = entries[i];
	console.log(`Scraping tweet ${i + 1}/${entries.length}: ${entry.tweetId}`);

	try {
		const data = await scrapeTweet(entry.tweetId);
		const md = toMarkdown(data, entry);
		const outFile = join(outputDir, `${entry.tweetId}.md`);
		writeFileSync(outFile, md, 'utf-8');
		console.log(`  ✓ Saved to ${outFile}`);
	} catch (error) {
		console.error(`  ✗ Error scraping tweet ${entry.tweetId}:`, error);

		const errLines = [entry.url, '', '---', '', 'Error scraping tweet'];
		if (entry.comment) errLines.push('', entry.comment);
		errLines.push('', '---', '', '```json', JSON.stringify({ error: String(error) }, null, 2), '```');

		const outFile = join(outputDir, `${entry.tweetId}.md`);
		writeFileSync(outFile, errLines.join('\n'), 'utf-8');
	}
}

console.log(`\nDone! ${entries.length} tweets processed.`);

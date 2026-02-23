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

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractTweetId, isTwitterUrl, scrapeAndSave, parseOutputDirArg, ensureDir, type TweetEntry } from './lib';

const { outputDir, remainingArgs } = parseOutputDirArg(process.argv.slice(2));

const inputFile = remainingArgs[0];

if (!inputFile) {
	console.error('Usage: bun scrape-batch.ts <input-file> [--output-dir <dir>]');
	process.exit(1);
}

// ── parse input ─────────────────────────────────────────────────────

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

pushEntry();

console.log(`Found ${entries.length} tweet entries to scrape`);

// ── scrape ──────────────────────────────────────────────────────────

ensureDir(outputDir);

for (let i = 0; i < entries.length; i++) {
	console.log(`Scraping tweet ${i + 1}/${entries.length}: ${entries[i].tweetId}`);
	await scrapeAndSave(entries[i], outputDir);
}

console.log(`\nDone! ${entries.length} tweets processed.`);

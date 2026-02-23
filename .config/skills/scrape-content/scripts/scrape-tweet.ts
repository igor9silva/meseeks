#!/usr/bin/env bun
// scrape a single tweet and save as markdown
// usage: bun scrape-tweet.ts <url> [comment] [--output-dir <dir>]
//
// examples:
//   bun scrape-tweet.ts "https://x.com/pmarca/status/2010858340088479886?s=12"
//   bun scrape-tweet.ts "https://x.com/pmarca/status/2010858340088479886?s=12" "Revolut pitch deck"
//   bun scrape-tweet.ts "https://x.com/pmarca/status/2010858340088479886?s=12" --output-dir ./scraped

import { extractTweetId, scrapeAndSave, parseOutputDirArg, ensureDir } from './lib';

const { outputDir, remainingArgs } = parseOutputDirArg(process.argv.slice(2));

const tweetUrl = remainingArgs[0];
const comment = remainingArgs[1] || undefined;

if (!tweetUrl) {
	console.error('Usage: bun scrape-tweet.ts <url> [comment] [--output-dir <dir>]');
	process.exit(1);
}

const tweetId = extractTweetId(tweetUrl);

if (!tweetId) {
	console.error(`Could not extract tweet ID from: ${tweetUrl}`);
	process.exit(1);
}

ensureDir(outputDir);

console.log(`Scraping tweet: ${tweetId}`);
await scrapeAndSave({ url: tweetUrl, tweetId, comment }, outputDir);

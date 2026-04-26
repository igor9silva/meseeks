---
name: scrape-content
description: Scrape tweets and web content, saving results as structured markdown files. Use when the user asks to scrape a tweet, scrape a URL, fetch tweet content, save a link, archive a post, or process a list of links to scrape.
---

# Scrape Content

Scrape tweets (Twitter/X), capture web content, and transcribe local media files into markdown. API keys and implementation details are handled by the scripts in `scripts/`.

## Scope Boundary

This skill is for content extraction and markdown capture.

If the user wants the actual media file from a supported site, do not improvise with custom scraping first. Use the globally installed `yt-dlp` as the default downloader, then use this skill only if markdown/content extraction is still needed.

- bad: parse an Instagram reel page by hand when the request is `download the video`
- good: use `yt-dlp` for the reel/video download, then use this skill only for any extra content extraction

## Usage

### Single tweet

```bash
bun scripts/scrape-tweet.ts <url> [comment] [--output-dir <dir>]
```

### Batch (from file)

```bash
bun scripts/scrape-batch.ts <input-file> [--output-dir <dir>]
```

### Local media transcription with Gemini 2.5 Flash

Use this when the user already has a downloaded local audio or video file and wants a transcript.

Requirements:

- `GEMINI_API_KEY` in the environment

```bash
bun scripts/transcribe-media.ts /absolute/path/to/video.mp4
```

Useful flags:

- `--output <file>`: write somewhere else instead of the default sibling `*.transcript.md`
- `--stdout`: print the markdown transcript instead of writing a file
- `--prompt <text>`: override the default transcription prompt
- `--model <model>`: override the default `gemini-2.5-flash`
- `--keep-upload`: keep the Gemini Files API upload instead of deleting it after transcription

Current behavior:

- uploads the local media file to Gemini Files API
- waits until Gemini marks the file `ACTIVE`
- asks `gemini-2.5-flash` for a transcript
- writes markdown next to the media file by default
- deletes the remote Gemini upload after success or failure unless `--keep-upload` is set

Batch input file format — one URL per entry, optional comment on the next line, separated by `---`:

```
https://x.com/user/status/123
optional user comment
---
https://x.com/user/status/456
---
```

## Output

Default output directory is `./scraped` relative to cwd. Override with `--output-dir`.

Each tweet produces a `{tweetId}.md` file with this structure:

- tweet URL + human-readable date
- tweet text
- user comment (if provided)
- author link + display name
- engagement metrics (likes, retweets, replies, views; quotes/bookmarks only when > 0)
- full raw API response as JSON

On error, the file is still created with error info so nothing is silently lost.

## User Comments

Comments are **critically important context** provided by the user. They appear after the tweet text and before the author info. Never lose them.

## Self-Improvement

This skill is designed to evolve:

- **Add new scripts** in `scripts/` for new scraping sources
- **Update `lib.ts`** to fix bugs, improve tweet output, or add shared utilities
- **Edit this SKILL.md** to document new capabilities

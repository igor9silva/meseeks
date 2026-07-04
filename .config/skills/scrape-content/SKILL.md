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

### Download external media into a task folder

Use this when a task points to Instagram, X/Twitter video, YouTube, TikTok, or another `yt-dlp` supported media URL and Igor asks to expand/archive/download it.

Save downloads under the owning task folder, never in a shared scratch folder:

```bash
mkdir -p private/files/inbox/<task-slug>/attachments
yt-dlp \
  --write-info-json \
  --write-thumbnail \
  --convert-thumbnails jpg \
  --output 'private/files/inbox/<task-slug>/attachments/<source>-%(id)s.%(ext)s' \
  '<url>'
```

After the download, update the task body with:

- the original URL
- a link to the downloaded video/audio file
- for video, a visible `<video controls src="attachments/<file>.mp4" />` embed immediately after the link
- a link to the `*.info.json` metadata backup
- the useful metadata from `*.info.json` such as uploader, id, date, duration, likes, comments, and caption summary

A thumbnail is secondary metadata. Never use a thumbnail as the main embed when the source is a video; the task body should render the video itself.

Do not write "missing attachment" until you have checked the source app/export/cache again. For TickTick imports, attachments are often recoverable from the local TickTick attachment cache even when the first import missed them.

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

When scraped content is saved into `files/` or `private/files/`, follow `files/README.md` for placement and `files/TAGS.md` for tag semantics.

If the scrape is saved directly under `tasks/`, `references/`, or `ideas/`, include the matching `class:*` tag. Inbox captures stay without `class:*` until reviewed.

For saved-reading or archive-style task files, the scraped page body comes first and the `## Source` block goes last. Do not replace a content backup with `Summary` / `Key Points` unless the user asked for analysis. Use a short semantic filename and preserve the original URL plus canonical URL when available.

After expanding a link into a local task or reference, preserve an existing meaningful user-authored title/body. Refresh title/slug only when the pre-scrape label is source debris, such as a URL, social card, username, or import hash. If preserving the title, add the expanded meaning as body metadata or prose.

For demand references, keep the source itself as the body. If Igor provides a title/body, use that directly and do not add "Demand signal", "Requested features", "Why it matters", or similar analysis sections. For tweet demand references, attached tweet media is part of the tweet content and should render with the tweet text in the body; source URLs, metrics, raw scrape backups, and JSON belong after that.

Do not add "Scraped tweet" or other source-tool labels to the readable body. The URL, metrics, and raw backup already show where the content came from.

Do not save raw HTML page snapshots for routine product/tool websites just because a tweet links to them. For tool references, a backed-up tweet scrape plus the tool website URL is enough unless the page itself is the fragile artifact Igor explicitly asked to archive.

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

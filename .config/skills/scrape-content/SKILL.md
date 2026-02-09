---
name: scrape-content
description: Scrape tweets and web content, saving results as structured markdown files. Use when the user asks to scrape a tweet, scrape a URL, fetch tweet content, save a link, archive a post, or process a list of links to scrape.
---

# Scrape Content

Scrape tweets (Twitter/X) and web pages, persisting results as markdown files.

## Scripts

All scripts live in `scripts/` next to this file. Run with `bun`.

### Single tweet

```bash
bun scripts/scrape-tweet.ts <url> [comment] [--output-dir <dir>]
```

Examples:

```bash
bun scripts/scrape-tweet.ts "https://x.com/pmarca/status/2010858340088479886"
bun scripts/scrape-tweet.ts "https://x.com/pmarca/status/2010858340088479886" "Great thread"
bun scripts/scrape-tweet.ts "https://x.com/pmarca/status/2010858340088479886" --output-dir ./my-dir
```

### Batch (from file)

```bash
bun scripts/scrape-batch.ts <input-file> [--output-dir <dir>]
```

Input file format (entries separated by `---`):

```
https://x.com/user/status/123
optional user comment
---
https://x.com/user/status/456
---
```

## API

Twitter scraping uses RapidAPI `twitter154` endpoint. API key is loaded from `data/skills/config.ts` (falls back to `RAPID_API_KEY` env var).

Web page scraping uses Firecrawl (`data/skills/definitions/firecrawl/scrapeLink.ts`). API key is `API_KEYS.scrapeLink`.

## Markdown Output Format

Each scraped tweet produces a `{tweetId}.md` file:

```
{tweet URL}
{human date} ({ISO date})

---

{tweet text}

{user comment - CRITICAL: never lose these}

[@{username}](https://x.com/{username}) {display name}

Likes: N | Retweets: N | Replies: N | Views: N | Quotes: N | Bookmarks: N

---

\```json
{full API response}
\```
```

Rules:
- empty line before `---` (markdown renderer needs it)
- username is clickable, display name is plain text, username first
- date: `January 28, 2026 (2026-01-28T20:42:31.000Z)`
- only show Quotes/Bookmarks when > 0
- if tweet not found: "Tweet not found" in body
- on error: still create the file with error info

## User Comments

Comments from the input file are **critically important context**. They appear after the tweet text and before the author info. Never lose them.

## Default Output

Files go to `data/tasks/scraped/` unless `--output-dir` is specified.

## Self-Improvement

This skill is designed to evolve. You are encouraged to:

- **Create new scripts** in `scripts/` for new scraping sources (YouTube, Reddit, web pages, etc.)
- **Update existing scripts** to fix bugs, improve output, or add features
- **Edit this SKILL.md** to document new capabilities, improve instructions, or refine the output format based on what worked well
- **Add dependencies** using `bun add <package>` when a new scraping source needs a library
- **Add new output formats** or adapt the markdown template as needs change

Treat this entire skill directory as a living toolkit - not a frozen artifact.

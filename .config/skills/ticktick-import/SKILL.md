---
name: ticktick-import
description: Import tasks from TickTick into the Meseeks task system, sync link buckets from TickTick Inbox, or create TickTick tasks from local link files. Use when the user asks to fetch TickTick tasks, import from TickTick, sync TickTick, pull tasks from TickTick, discover their inbox ID, or push curated local links back into TickTick.
---

# TickTick Import

This skill now has two real paths. Pick the one that matches the job instead of forcing everything through the public Open API.

## Paths

### 1. Open API path

Use this when you need a broad snapshot of projects/tasks from TickTick's public API.

Scripts:

- `scripts/fetch-tasks.ts`
- `scripts/discover-inbox.ts`

Requirements:

- `TICKTICK_API_TOKEN`
- optionally `TICKTICK_INBOX_ID`
- optionally `TICKTICK_GROUP_NAMES`

### 2. Native macOS app path

Use this when you need Inbox-specific link syncing or to create TickTick tasks from local files and the public API token is unavailable.

This path reads TickTick's local macOS data and, when needed, uses the native app's authenticated session to call TickTick's private API.

Scripts:

- `scripts/import-links.ts`
- `scripts/reshape-links.ts`
- `scripts/create-reference-ticktick-tasks.ts`

Requirements:

- macOS
- TickTick desktop app installed and signed in
- local TickTick store at `~/Library/Group Containers/75TY9UT8AY.com.TickTick.task.mac/OSXCoreDataObjC.storedata`

Hard rule:

- do not write directly into TickTick's SQLite task tables unless the user explicitly asks for that hack
- prefer the native app session + HTTP API for writes
- when a TickTick task points to downloadable media from a supported site, prefer `yt-dlp` for fetching the actual file after you extract the link

## Scripts

All scripts live in `scripts/` next to this file. Run with `bun`.

### Fetch all tasks

Fetches all projects and uncompleted tasks from TickTick's public Open API and saves JSON snapshots.

```bash
bun scripts/fetch-tasks.ts [--output-dir <dir>]
```

Output files:

- `projects.json`
- `all-tasks.json`
- `tasks-by-project.json`
- `summary.json`

### Discover inbox ID

TickTick's Open API does not expose the Inbox project ID directly. This script discovers it by creating and deleting a temporary task.

```bash
bun scripts/discover-inbox.ts
```

It prints the inbox ID so it can be exported as:

```bash
export TICKTICK_INBOX_ID="inbox118693896"
```

### Import link buckets from TickTick Inbox

Reads a parent task from TickTick Inbox via the local macOS database, scrapes each child link, and writes `.mdx` files into `private/tasks/links`.

```bash
bun scripts/import-links.ts \
  --parent-title 'twitter links' \
  --skip-existing \
  --import-date 2026-04-12 \
  --summary-file /tmp/twitter-links-sync-summary.json
```

Useful flags:

- `--parent-title <title>`: pick the Inbox grouping task, for example `twitter links` or `other links`
- `--skip-existing`: leave already-imported child tasks alone
- `--delete-missing`: remove local files whose TickTick child task no longer exists under that parent
- `--summary-file <file>`: write a machine-readable summary of `created`, `kept`, and `deleted`
- `--import-date <YYYY-MM-DD>`: stamp imports explicitly
- `--concurrency <n>`: scrape in parallel
- `--output-dir <dir>`: override the default `private/tasks/links`

Current behavior:

- dedupes by TickTick child task id
- scans the output directory recursively, so manually moved files under `links/*/*` still count as existing
- does not preserve custom subfolder placement for newly created files; it only avoids touching existing moved files
- for existing tasks under `--skip-existing`, it does not rescrape or rewrite

### Reshape imported link files

Rewrites already-imported link files into the flat format used now:

- original link
- separator
- raw scraped markdown
- separator
- preserved TickTick snapshot / metadata

```bash
bun scripts/reshape-links.ts
```

Use this when the file shape changes but the underlying imported data should stay the same.

### Create TickTick `References` tasks from local files

Creates TickTick tasks in the `References` project from local files under `private/tasks/links/references`.

```bash
bun scripts/create-reference-ticktick-tasks.ts \
  --summary-file /tmp/ticktick-references-create-summary.json
```

Current behavior:

- reads local files from `private/tasks/links/references`
- extracts the original link from the file metadata payload
- derives a human title from the first meaningful scraped line instead of using the raw URL
- stores the original link plus scraped body in TickTick `content`
- dedupes against existing `References` tasks by link
- creates only missing tasks
- uses the native app's authenticated session from local cookie/app state

Implementation note:

- this script writes through TickTick's private API using:
  - cookie `t=...` from the app cookie store
  - `X-Device` from the active user in the local DB
- this is the right compromise when the public Open API token is unavailable

## Configuration

### Open API env vars

| Variable | Required | Description |
|---|---|---|
| `TICKTICK_API_TOKEN` | Yes for Open API scripts | Bearer token for TickTick Open API |
| `TICKTICK_INBOX_ID` | No | Inbox project ID for `fetch-tasks.ts` |
| `TICKTICK_GROUP_NAMES` | No | JSON mapping of group IDs to names |

Example:

```bash
export TICKTICK_GROUP_NAMES='{"6456ad357415514d9ac101b5":"To","66b90a07e2cf110236120901":"Other"}'
```

### Native macOS app state

For the local/native path, the important files are:

- `~/Library/Group Containers/75TY9UT8AY.com.TickTick.task.mac/OSXCoreDataObjC.storedata`
- `~/Library/Containers/com.TickTick.task.mac/Data/Library/Cookies/Cookies.binarycookies`

These are read by the scripts automatically. No env var is required for that path.

## Workflow Guidance

### Broad snapshot

Use:

1. `discover-inbox.ts` if needed
2. `fetch-tasks.ts`

### Inbox links -> local files

Use:

1. `import-links.ts --parent-title ... --skip-existing`
2. optionally `reshape-links.ts` if the target file shape changed

### Inbox task -> media file

Use this when the user wants the actual asset from a TickTick task instead of a markdown import.

1. Read the task from TickTick using the existing native macOS path or cached local data.
2. Extract the first real media URL from the task title/content/description.
3. Use the globally installed `yt-dlp` as the default downloader for supported media sites like Instagram, YouTube, and X video links.
4. Move the downloaded file into the repo only if the user asked for that; otherwise keep it in a temporary download location and report the path.

Examples:

- bad: build a custom downloader for an Instagram reel when the request is just `download the video`
- good: fetch the TickTick task, grab the reel URL, run `yt-dlp`, and then place the file where the user asked

### Local references -> TickTick References

Use:

1. `create-reference-ticktick-tasks.ts`
2. inspect the summary JSON

## Warnings

- The Open API token and the native app session are not interchangeable.
- `ZTTUSER.ZACCESSTOKEN` from the local DB is not accepted by the public Open API.
- For native writes, the working auth came from the app cookie store plus `X-Device`.
- If the user manually reorganized `private/tasks/links`, do not flatten or “fix” their folders during sync.
- If a sync should only import new items, use `--skip-existing`.
- If the user explicitly says “do not rescrape anything”, do not rescrape existing files.

## Self-Improvement

This skill is expected to evolve. Good improvements:

- smarter dedupe by URL as well as TickTick task id
- configurable local subfolder placement for newly imported links
- generalized local-file -> TickTick project sync, not just `References`
- explicit dry-run mode for TickTick writes

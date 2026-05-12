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

- `scripts/import-project-tasks.ts`
- `scripts/import-links.ts`
- `scripts/mark-meseeks-migrated.ts`
- `scripts/mark-references-migrated.ts`
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

### Import Meseeks and References projects

Reads open, non-deletion-flagged tasks from TickTick's local macOS database and writes local task files without touching TickTick.

```bash
bun scripts/import-project-tasks.ts \
  --import-date 2026-05-11 \
  --summary-file organize/ticktick-import-2026-05-11.json
```

Current behavior:

- imports Meseeks into `private/tasks/inbox`
- imports References into `private/tasks/references`
- tags every imported file with `source:ticktick` and `ticktick-list:<list>`
- tags Meseeks board columns as `ticktick-status:<status>`, for example `ticktick-status:user-interface`
- treats TickTick priority `0` as unset and omits local `priority`; maps TickTick `1`, `3`, and `5` to `low`, `medium`, and `high`
- imports TickTick child task rows as real local subtasks under the parent task folder
- skips already imported TickTick task IDs unless `--overwrite` is passed
- copies TickTick attachments into the imported task folder as `attachments/*`
- writes tasks with attachments as `_index.md` task folders, so the task key stays stable while attachments live inside the task
- falls back to the local TickTick attachment cache when `ZLOCALFILEPATH` is empty
- records missing local attachment files in the task payload instead of pretending they imported

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

### Mark imported `References` tasks migrated in TickTick

Marks open TickTick `References` tasks that already exist under `private/tasks/references` as TickTick `won't do` and appends a migration note to their content.

```bash
bun scripts/mark-references-migrated.ts \
  --apply \
  --timestamp 2026-05-11T15:05:44Z \
  --summary-file /tmp/ticktick-references-migrated.json
```

Current behavior:

- dry-runs by default unless `--apply` is passed
- only targets open TickTick rows whose task ID appears in imported local files
- writes through TickTick's private API instead of mutating SQLite
- preserves title, content, description, and priority while setting status to TickTick `won't do`
- appends or replaces `Migrated into git: <ISO timestamp>` in TickTick content

### Mark imported Meseeks tasks migrated in TickTick

Marks open TickTick Meseeks tasks already imported into git as TickTick `won't do`, with stricter preflight checks and private backups.

```bash
bun scripts/mark-meseeks-migrated.ts \
  --apply \
  --timestamp 2026-05-11T15:41:44Z \
  --backup-dir private/tasks/.ticktick-migration-backups/meseeks-2026-05-11T15-41-44Z
```

Current behavior:

- dry-runs by default unless `--apply` is passed
- only targets open Meseeks rows, never completed rows
- refuses to apply if any open TickTick row is missing from local imports
- refuses to apply if TickTick attachment metadata is missing locally or imported attachment files are missing on disk
- refuses to apply when open rows have comments, reminders, or checklist items that need explicit review
- writes API-before, update payload, API-after, preflight, and summary files into the private backup directory
- verifies every target through TickTick API after the write

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
4. If the user wants a transcript after download, run `bun run transcribe:media <downloaded-file>` with `GEMINI_API_KEY` set and keep the transcript next to the media file unless they asked for a different destination.
5. Move the downloaded file into the repo only if the user asked for that; otherwise keep it in a temporary download location and report the path.

Examples:

- bad: build a custom downloader for an Instagram reel when the request is just `download the video`
- good: fetch the TickTick task, grab the reel URL, run `yt-dlp`, optionally transcribe it with `transcribe:media`, and then place the files where the user asked

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

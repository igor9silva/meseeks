---
name: ticktick-import
description: Import tasks from TickTick into the Meseeks task system. Use when the user asks to fetch TickTick tasks, import from TickTick, sync TickTick, pull tasks from TickTick, or discover their TickTick inbox ID.
---

# TickTick Import

Fetch tasks from TickTick's API and import them into the Meseeks task system as markdown files.

## Prerequisites

Set the `TICKTICK_API_TOKEN` environment variable with your TickTick API token (from [TickTick Developer Portal](https://developer.ticktick.com/)).

```bash
export TICKTICK_API_TOKEN="your_token_here"
```

## Scripts

All scripts live in `scripts/` next to this file. Run with `bun`.

### Fetch all tasks

Fetches all projects and uncompleted tasks from TickTick, saving JSON snapshots.

```bash
bun scripts/fetch-tasks.ts [--output-dir <dir>]
```

Output files (saved to `--output-dir` or the script directory):

- `projects.json` — all projects with path info
- `all-tasks.json` — all uncompleted tasks across projects
- `tasks-by-project.json` — tasks grouped by project
- `summary.json` — overview with counts

### Discover inbox ID

TickTick's API doesn't expose the Inbox project ID directly. This script discovers it by creating and immediately deleting a temporary task.

```bash
bun scripts/discover-inbox.ts
```

Prints the inbox ID. Set it as `TICKTICK_INBOX_ID` environment variable for `fetch-tasks.ts` to include Inbox tasks.

```bash
export TICKTICK_INBOX_ID="inbox118693896"
```

## Configuration

All configuration is via environment variables:

| Variable | Required | Description |
|---|---|---|
| `TICKTICK_API_TOKEN` | Yes | Bearer token for TickTick API |
| `TICKTICK_INBOX_ID` | No | Inbox project ID (use `discover-inbox.ts` to find it) |
| `TICKTICK_GROUP_NAMES` | No | JSON mapping of group IDs to names (e.g. `{"abc123": "Work"}`) |

### Group names

TickTick's v1 API doesn't expose group (folder) names, only IDs. To get human-readable paths, set `TICKTICK_GROUP_NAMES` as a JSON object:

```bash
export TICKTICK_GROUP_NAMES='{"6456ad357415514d9ac101b5": "To", "66b90a07e2cf110236120901": "Other"}'
```

The script will warn about any group IDs it encounters that aren't in this mapping.

## Workflow

1. Run `discover-inbox.ts` once to find your inbox ID
2. Set env vars
3. Run `fetch-tasks.ts` to snapshot your TickTick tasks
4. Review the JSON output and decide which tasks to convert to Meseeks task files
5. Use the task format from `private/tasks/README.md` for conversion

## Self-Improvement

This skill is designed to evolve. You are encouraged to:

- **Add conversion scripts** to transform TickTick JSON into Meseeks `.mdx` task files
- **Add filtering** by project, priority, or tags
- **Update this SKILL.md** as capabilities grow

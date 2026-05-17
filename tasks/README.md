# Tasks

This is the public root task for Meseeks product and repo work.

`private/tasks/` is the private root task. It has the same shape, but it is for sensitive material, personal work, raw imports, phone captures, and unreviewed staging.

## Shape

Every task is a folder with exactly one `_index.md`, `_index.mdx`, or `_index.txt`.

Examples:

- `tasks/_index.md`
- `tasks/tasks/reactor-v1/_index.mdx`
- `private/tasks/inbox/raw-capture/_index.md`
- `tasks/references/some-library/_index.md`

Attachments and real subtasks live inside the owning task folder. A plain directory without `_index.*` is not a task; add `_index.*` if the directory is meaningful task hierarchy.

Use task folders when the task needs attachments, real subtasks, or a colocated source/reference collection. Do not create topic folders just to group tasks; use tags and Organizer filters.

## Roots

- `tasks/` is public. Product, repo, roadmap, implementation work, and public references go here when safe.
- `private/tasks/` is private. Personal, sensitive, raw, strategic, or unreviewed material starts here.

Raw TickTick, phone, browser, and reading-list captures default to `private/tasks/inbox/`. Move them public only after review.

## Root Children

Each root has four first-class child tasks:

- `inbox/` for raw captures pending triage.
- `tasks/` for actionable work.
- `references/` for searchable material that is not itself work.
- `ideas/` for possible projects, product thoughts, use cases, side projects, and experiments.

Inbox is temporary. Reviewed inbox items should leave inbox unless a `human:*` tag intentionally keeps them blocked there.

## Lifecycle

Filesystem path does not define lifecycle anymore.

Actionable tasks under `*/tasks/` use exactly one lifecycle tag:

- `status:backlog`
- `status:active`
- `status:completed`

Do not add lifecycle status tags to `inbox/`, `references/`, or `ideas/` by default.

Completed tasks migrate and remain indexed, but Organizer hides `status:completed` by default. Completed tasks are history: do not rewrite, retag, rename, or move them unless Igor explicitly asks.

If we decide not to do a task, delete it. If the file contains useful context, move only that context to `references/` and delete the task shell.

## Config

Each task folder may own `_config.json`.

`_config.json` is machine-owned Organizer config, not task prose. It can define:

- `view`: `list` or `board`
- `scope`: currently `direct`
- `columns`: board columns matched by tags
- `hiddenTags`: tags hidden by default, usually `status:completed`

Root tasks and `inbox/`, `references/`, `ideas/` use list views by default. The `tasks/` branch uses a board with `Backlog` and `Active` columns by default. Children that do not match a configured column render under `Unsorted`; nothing should disappear.

## Tags

Use [TAGS.md](TAGS.md) as the canonical registry.

Tags carry reusable organization. `status:*` carries actionable lifecycle. Source namespaces such as `source:*`, `ticktick-list:*`, and `ticktick-status:*` preserve provenance.

`ticktick-status:*` is source metadata from TickTick. It is not our current lifecycle.

## Source Metadata

First imports must preserve every possible bit of source information: raw text, URLs, IDs, timestamps, board/list state, source JSON, attachments, comments, reminders, and import notes.

After imported source material has been committed once, organizing and uncluttering passes may remove routine raw source blocks or JSON when they no longer help the task. Git history is the durable import backup.

For saved-reading backups, put readable page content first and source metadata last. The point is quick reading and local backup.

## Private To Public

Private-to-public movement requires review.

Before moving private material into `tasks/`:

- remove secrets, personal data, private account details, and raw sensitive captures
- preserve useful source metadata
- keep raw private source notes in `private/tasks/references/` when needed
- split mixed files instead of laundering private context into a public task

Meseeks product and repo work should end up public when safe. Personal staging and raw imports can stay private.

## Organizer Routes

Organizer follows task paths:

- `/` shows the global overview across public and private.
- `/public` shows `tasks/`.
- `/private` shows `private/tasks/`.
- `/public/tasks/reactor-v1` shows `tasks/tasks/reactor-v1/_index.*`.
- `/private/inbox/foo` shows `private/tasks/inbox/foo/_index.*`.

Use `?selected=<child-slug>` for the right panel and `?detail=expanded` for expanded detail.

Old `?taskKey=...` URLs are intentionally gone.

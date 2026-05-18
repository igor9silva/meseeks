# Files

This is the public root task for Meseeks product and repo work.

`private/files/` is the private root task. It has the same shape, but it is for sensitive material, personal work, raw imports, phone captures, and unreviewed staging.

## Shape

Every task is a folder with exactly one `_index.md`, `_index.mdx`, or `_index.txt`.

Examples:

- `files/_index.md`
- `files/tasks/reactor-v1/_index.mdx`
- `private/files/inbox/raw-capture/_index.md`
- `files/references/some-library/_index.md`

Attachments and real subtasks live inside the owning task folder. A plain directory without `_index.*` is not a task; add `_index.*` if the directory is meaningful task hierarchy.

Use task folders when the task needs attachments, real subtasks, or a colocated source/reference collection. Do not create topic folders just to group tasks; use tags and Organizer filters.

## Roots

- `files/` is public. Product, repo, roadmap, implementation work, and public references go here when safe.
- `private/files/` is private. Personal, sensitive, raw, strategic, or unreviewed material starts here.

Raw TickTick, phone, browser, and reading-list captures default to `private/files/inbox/`. Move them public only after review.

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

Organizer UI preferences live in `private/files/organizer.json`.

That file is machine-owned UI/navigation config, not task prose. Entries are keyed by task identity:

- `/` for the global root
- `public:<task path>` for public tasks
- `private:<task path>` for private tasks

Each entry can define:

- `view`: `list` or `board`
- `scope`: currently `direct`
- `columns`: board columns matched by tag or source
- `minDepth` and `maxDepth`: default subtask depth range
- `sort`: default subtask sorting
- `panelSizes`: current panel, selected panel, and tag-filter sizes
- `panels`: persisted panel visibility

Root tasks and `inbox/`, `references/`, `ideas/` use list views by default. The `tasks/` branch uses a board with `Backlog` and `Active` columns by default. Children that do not match a configured column render under `Unsorted`; nothing should disappear.

## Tags

Use [TAGS.md](TAGS.md) as the canonical registry.

Tags carry reusable organization. `class:*` carries task kind. `status:*` carries actionable lifecycle. Source namespaces such as `source:*`, `ticktick-list:*`, and `ticktick-status:*` preserve provenance.

`ticktick-status:*` is source metadata from TickTick. It is not our current lifecycle.

Use `class:task`, `class:reference`, or `class:idea` in frontmatter for reviewed non-inbox files so Organizer can filter task kind across public and private roots. Inbox and root tasks do not get a class tag.

## Source Metadata

First imports must preserve every possible bit of source information: raw text, URLs, IDs, timestamps, board/list state, source JSON, attachments, comments, reminders, and import notes.

After imported source material has been committed once, organizing and uncluttering passes may remove routine raw source blocks or JSON when they no longer help the task. Git history is the durable import backup.

For saved-reading backups, put readable page content first and source metadata last. The point is quick reading and local backup.

## Private To Public

Private-to-public movement requires review.

Before moving private material into public:

- remove secrets, personal data, private account details, and raw sensitive captures
- preserve useful source metadata
- keep raw private source notes in `private/files/references/` when needed
- split mixed files instead of laundering private context into a public task

Meseeks product and repo work should end up public when safe. Personal staging and raw imports can stay private.

## Organizer Routes

Organizer follows task paths:

- `/` shows the global overview across public and private.
- `/public` shows `files/`.
- `/private` shows `private/files/`.
- `/public/tasks/reactor-v1` shows `files/tasks/reactor-v1/_index.*`.
- `/private/inbox/foo` shows `private/files/inbox/foo/_index.*`.

Use `?selected=<child-slug>` for the right panel and `?detail=expanded` for expanded detail.

Old `?taskKey=...` URLs are intentionally gone.

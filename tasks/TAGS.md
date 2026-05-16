# Task Tags

This is the canonical registry for Meseeks task tags. Other task skills should point here instead of redefining tag semantics.

## Rules

- Tags are for reusable organization. Buckets define lifecycle; roots define visibility.
- Keep tags short, lowercase, and reusable. Prefer existing tags before creating new ones.
- Do not add model names, provider names, vendor names, one-off feature names, or tags that repeat the title, bucket, source label, or current folder.
- Source namespaces are the exception to short topic tags: `source:*`, `ticktick-list:*`, and `ticktick-status:*` preserve provenance.
- `ticktick-status:*` is source metadata from the original TickTick board column. It is not the current filesystem bucket/status.
- When adding a broad semantic tag, scan nearby tasks and obvious duplicates so the tag does not become a one-off accident.
- Use task folders when the task needs attachments, real subtasks, or a colocated reference/source collection. Otherwise prefer a single task file. Do not create topic folders just to group tasks; use tags and Organizer filters for that.

## Source Provenance

When importing from an external system into our repo, preserve every possible bit of information: raw source text, source URLs, IDs, timestamps, board/list state, attachments, exported JSON, and any other provenance we can capture. That first import commit is the durable backup.

After source material has been imported and committed, later organizing/uncluttering can delete raw source blocks, TickTick JSON, generic `Source` sections, and other unused import debris when merging or rewriting tasks. Keep only the provenance and source content that still helps the task or reference.

## Source And Import Tags

| Tag | Use |
| --- | --- |
| `source:*` | Where the task came from. Examples: `source:ticktick`, `source:safari-reading-list`. |
| `ticktick-list:*` | Original TickTick list/project. Examples: `ticktick-list:meseeks`, `ticktick-list:references`. |
| `ticktick-status:*` | Original TickTick board column. Examples: `ticktick-status:inbox`, `ticktick-status:user-interface`, `ticktick-status:use-case`. This is not the current task bucket. |
| `scraped` | A capture was expanded from a link or raw source into local content. |

## Semantic Tags

| Tag | Use |
| --- | --- |
| `auth` | Authentication, OAuth, account, login, and session work. |
| `billing` | Billing and payment lifecycle work. Use `legacy` too when the issue belongs to pre-Reactor architecture. |
| `bi-render` | Rendering one conceptual component, action, task, or skill for both humans and AI/model context. |
| `brainstorm` | Private inbox idea captures to revisit later. Leave them private inbox during broad classification unless Igor asks. |
| `chore` | Non-app admin tasks Igor has to do, usually private backlog unless Igor says public. |
| `customization` | User-driven app customization: selecting UI/components and asking AI to change appearance or behavior directly. |
| `debt` | Technical debt, refactors, cleanup, hardening, or maintenance work. |
| `demand` | Market-demand signal. Visibility is separate; demand references can be public or private. Usually keep the raw signal because the signal itself is the artifact. |
| `energy` | Budget, cost, confidence, accounting, or energy behavior. |
| `funding` | Igor's funding review queue. Do not infer or spread this tag; skip during broad classification unless Igor asks. |
| `intelligence` | AI model/model-provider support tasks only. The work is usually "add support", not "evaluate". |
| `legacy` | Pre-Reactor-v1 work kept as useful context until Reactor v1 supersedes or revalidates it. |
| `loop` | Reusable loop behavior Meseeks/Pro should support, sibling to `skill`. Examples: answer drafting loops, discussion loops, fact-check loops, seek-like execution loops. |
| `multi-player` | Multiple users, actors, tasks, shared resources, collaboration, liability, or cross-actor effects. |
| `observability` | Monitoring, logging, traces, inspection, error reporting, or backoffice visibility. |
| `personal` | Private life/history tasks. Keep private by default. |
| `reactor` | Reactor v1/core engine/platform work. |
| `security` | Security, authorization, abuse prevention, XSS, secrets, sandboxing, unsafe execution, or policy. |
| `side` | Side projects or code prototypes. Prefer `ideas/` for ordinary product ideas; use `side` when the task is about a side project/prototype itself. |
| `skill` | Skills/integrations we want to add to Meseeks. |
| `tech` | Everything technical: libraries, tools, implementation references, prompts, systems, and engineering material. It does not force the reference to stay raw; preserve details or synthesize depending on the source and instruction. |
| `to-read` | Private saved-reading queue. Keep in `private/tasks/inbox/` unless Igor explicitly asks to classify or move the item. Do not turn it into `references/`, `backlog/`, or `demand` just because the article overlaps with Meseeks. |
| `transparency` | Public proof, accountability, metrics, traces, or other transparency surfaces. |
| `ux` | Interface, design, interaction, product-experience, or UI inspiration. Can coexist with `tech` for technical references that shape UI feel. |
| `vfs` | Virtual filesystem/Reactor filesystem material. Skip during broad inbox classification unless Igor asks. |

## Broad Classification Skips

During broad inbox classification, skip these unless Igor explicitly asks:

- `brainstorm`
- `funding`
- `to-read`
- `vfs`

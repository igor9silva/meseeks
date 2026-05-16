# Task Tags

This is the canonical registry for Meseeks task tags. Other task skills should point here instead of redefining tag semantics.

## Rules

- Tags are for reusable organization. Buckets define lifecycle; roots define visibility.
- Keep tags short, lowercase, and reusable. Prefer existing tags before creating new ones.
- Do not add model names, provider names, vendor names, one-off feature names, or tags that repeat the title, bucket, source label, or current folder.
- Only tags listed in this registry are canonical. Do not invent aliases.
- Do not normalize tags inside `completed/`. Completed tasks are history; leave their old shape alone unless Igor explicitly asks.
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

## Human Tags

`human:*` means the item is blocked on human intervention or human review. Do not auto-complete it or over-organize it away.

| Tag | Use | Placement |
| --- | --- | --- |
| `human:brainstorm` | Private brainstorm capture that must be reviewed and organized by Igor later. | Private inbox only. |
| `human:funding` | Igor's funding review queue. Do not infer or spread this tag. | Private inbox only. |
| `human:to-read` | Private saved-reading queue. | Private inbox only. |
| `human:vfs` | Virtual filesystem/Reactor filesystem material to leave out of broad classification for now. | Private inbox only unless Igor asks. |

## Semantic Tags

When a placement says backlog, active and completed are still valid when the lifecycle genuinely says so. The point is that those tags should not sit in inbox, ideas, or references.

| Tag | Use | Placement |
| --- | --- | --- |
| `auth` | Authentication, OAuth, account, login, and session work. | Actual tasks in backlog by default. |
| `billing` | Billing and payment lifecycle work. | Actual tasks in backlog by default. |
| `chore` | Admin tasks Igor has to do. | Private backlog only. |
| `debt` | Technical debt, refactors, cleanup, hardening, or maintenance work. | Actual tasks in backlog by default. |
| `demand` | Market-demand signal tracking. Keep the raw signal because the signal itself is the artifact. | Private references only. |
| `intelligence` | AI model/model-provider support tasks only. The work is usually "add support", not "evaluate". | Public backlog only. |
| `legacy` | Pre-Reactor-v1 work kept as useful context until Reactor v1 supersedes or revalidates it. | Add alongside the current useful tag; do not use as a dumping ground. |
| `loop` | Reusable loop behavior Meseeks/Pro should support, sibling to `skill`. Examples: answer drafting loops, discussion loops, fact-check loops, seek-like execution loops. | Backlog by default. |
| `multi-player` | The next big upgrade after Reactor v1: multi-player features, multiple users/actors/tasks/resources, collaboration, liability, or cross-actor effects. | Backlog by default. |
| `observability` | Monitoring, logging, traces, inspection, error reporting, or backoffice visibility. | Backlog by default. |
| `personal` | Private life/history tasks. | Private only. |
| `security` | Security, authorization, abuse prevention, XSS, secrets, sandboxing, unsafe execution, policy, or security reference material. | Backlog tasks or references. |
| `skill` | Skills/integrations we want to add to Meseeks. | Backlog by default. |
| `tech` | Everything technical: libraries, tools, implementation references, prompts, systems, and engineering material. It does not force the reference to stay raw; preserve details or synthesize depending on the source and instruction. | References only. |
| `transparency` | Public proof, accountability, metrics, traces, or other transparency surfaces. | Backlog by default. |
| `ux` | Interface, design, interaction, product-experience, or UI inspiration. Can coexist with `tech` for technical references that shape UI feel. | References or backlog tasks. |

## Broad Classification Skips

During broad inbox classification, skip `human:*` items unless Igor explicitly asks.

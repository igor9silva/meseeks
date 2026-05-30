# Task Tags

This is the canonical registry for Meseeks task tags. Other task skills should point here instead of redefining tag semantics.

## Rules

- Tags are for reusable organization. Roots define visibility. The first child task defines kind: `inbox`, `tasks`, `references`, or `ideas`.
- Use exactly one `class:*` tag on reviewed non-inbox files: `class:task`, `class:reference`, or `class:idea`.
- Actionable lifecycle is a tag: `status:backlog`, `status:active`, or `status:completed`.
- Keep tags short, lowercase, and reusable. Prefer existing tags before creating new ones.
- Do not add model names, provider names, vendor names, one-off feature names, or tags that repeat the title, root, source label, current section, or folder name.
- Only tags listed in this registry are canonical. Do not invent aliases.
- Do not normalize `status:completed` tasks. Completed tasks are history; leave their old shape alone unless Igor explicitly asks.
- Source namespaces are the exception to short topic tags: `source:*`, `ticktick-list:*`, and `ticktick-status:*` preserve provenance.
- `ticktick-status:*` is source metadata from the original TickTick board column. It is not current lifecycle.
- When adding a broad semantic tag, scan nearby tasks and obvious duplicates so the tag does not become a one-off accident.
- Use task folders when the task needs attachments, real subtasks, or a colocated reference/source collection. Otherwise keep the task folder shallow.

## Lifecycle Tags

Use exactly one `status:*` tag on actionable tasks under `*/tasks/`.

| Tag | Use |
| --- | --- |
| `status:backlog` | Valid work we might do later. |
| `status:active` | Work happening now or committed next. |
| `status:completed` | Achieved work. Historical by default. |

Do not add lifecycle tags to `inbox/`, `references/`, or `ideas/` unless Igor explicitly asks for an exception.

## Class Tags

`class:*` tags exist so Organizer can filter the same kind across public and private roots. They are written in task frontmatter and must match the first child task.

| Tag | Use |
| --- | --- |
| `class:task` | Actionable work under `*/tasks/`. |
| `class:reference` | Searchable material under `*/references/`. |
| `class:idea` | Possible projects, product thoughts, use cases, side projects, and experiments under `*/ideas/`. |

Inbox and root tasks do not get a class tag. The branch aggregator tasks `tasks/`, `references/`, and `ideas/` do get their matching class tag.

## Source Provenance

When importing from an external system into our repo, preserve every possible bit of information: raw source text, source URLs, IDs, timestamps, board/list state, attachments, exported JSON, and any other provenance we can capture. That first import commit is the durable backup.

After source material has been imported and committed, later organizing/uncluttering can delete raw source blocks, TickTick JSON, generic `Source` sections, and other unused import debris when merging or rewriting tasks. Keep only the provenance and source content that still helps the task or reference.

## Source And Import Tags

| Tag | Use |
| --- | --- |
| `source:*` | Where the task came from. Examples: `source:ticktick`, `source:safari-reading-list`. |
| `ticktick-list:*` | Original TickTick list/project. Examples: `ticktick-list:meseeks`, `ticktick-list:references`. |
| `ticktick-status:*` | Original TickTick board column. Examples: `ticktick-status:inbox`, `ticktick-status:user-interface`, `ticktick-status:use-case`. |
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

When placement says backlog, active and completed are still valid when the lifecycle genuinely says so. The point is that these tags should not sit in inbox unless they are still raw captures.

| Tag | Use | Placement |
| --- | --- | --- |
| `auth` | Authentication, OAuth, account, login, and session work. | Actionable tasks by default. |
| `behavior` | Improvements to existing skill instructions, agent behavior, prompts, or rules. Use this for changing how skills behave; use `skill` only for new skills/integrations we want to add. | Actionable tasks by default. |
| `benchmarks` | Benchmarks, evals, scoring suites, and comparison tests for Meseeks, models, loops, skills, or product behavior. | Actionable tasks or references. |
| `billing` | Billing and payment lifecycle work. | Actionable tasks by default. |
| `bug` | Broken or incorrect current product behavior, regressions, defects, or reliability issues that should be fixed. | Actionable tasks by default. |
| `operations` | Admin tasks Igor has to do. | Private actionable tasks. |
| `debt` | Technical debt, refactors, cleanup, hardening, or maintenance work. | Actionable tasks by default. |
| `demand` | Market-demand signal tracking. Keep the raw signal because the signal itself is the artifact. | Private references by default. |
| `entity` | Real-world entities worth keeping as durable context: people, companies, vehicles, organizations, accounts, and similar records. Store documents, identifiers, addresses, history, contact notes, and other entity facts in the body. | Private references ONLY. |
| `intelligence` | AI model/model-provider support tasks only. The work is usually "add support", not "evaluate". | Public actionable tasks by default. |
| `insight` | Conceptual insight, belief, mental model, or raw thought whose value is the idea itself rather than immediate work. | References by default. |
| `legacy` | Pre-Reactor-v1 work kept as useful context until Reactor v1 supersedes or revalidates it. | Add alongside the current useful tag. |
| `loop` | Reusable loop behavior Meseeks/Pro should support, sibling to `skill`. | Actionable tasks by default. |
| `maintainability` | Work that makes the codebase easier to understand, inspect, upgrade, debug, or keep healthy over time. Use this for engineering-system quality that is not just cleanup debt. | Actionable tasks by default. |
| `multi-player` | Multi-player features, multiple users/actors/tasks/resources, collaboration, liability, or cross-actor effects. | Private actionable tasks or references. |
| `observability` | Monitoring, logging, traces, inspection, error reporting, or backoffice visibility. | Actionable tasks by default. |
| `personal` | Private life/history tasks. | Private only. |
| `security` | Security, authorization, abuse prevention, XSS, secrets, sandboxing, unsafe execution, policy, or security reference material. | Actionable tasks or references. |
| `skill` | Skills/integrations we want to add to Meseeks. | Actionable tasks by default. |
| `tech` | Everything technical: libraries, tools, implementation references, prompts, systems, and engineering material. It does not force the reference to stay raw; preserve details or synthesize depending on the source and instruction. | References only. |
| `transparency` | Public proof, accountability, metrics, traces, or other transparency surfaces. | Actionable tasks by default. |
| `ux` | Interface, design, interaction, product-experience, or UI inspiration. Can coexist with `tech` for technical references that shape UI feel. | References or actionable tasks. |

## Entity References

Use `entity` only in private references. Keep one file per real-world entity.

Entity references can store lookup facts such as tax IDs, document numbers, IBANs, addresses, company registration data, vehicles, insurance policy numbers, historical company identifiers, relationship notes, and other durable facts.

## Broad Classification Skips

During broad inbox classification, skip `human:*` items unless Igor explicitly asks.

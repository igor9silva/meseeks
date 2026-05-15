# Unclutter Memory

Durable judgment for future Unclutter passes. This file is not a changelog. It should help answer: "what would Igor likely do with a similar task?"

## Core Loop

- Read `tasks/README.md` before changing tasks.
- Run `git status --short` before editing. If the tree is dirty, ask before continuing.
- Never stage, commit, amend, reset, or otherwise mutate Git review state.
- Collaborative review batches are calibration data. Apply Igor's disposition exactly, then extract the reusable reason into this memory when it helps future autonomous passes.
- Do not turn Igor's explanation into extra work on the current item. If he says `delete`, delete. If he says `public tech ref`, move it to public references with `tech`. If he says `done`, move it to `completed/` in the same root. The explanation trains the next pass.
- Do not overfit every comment into a global rule. Keep heuristics that would classify a similar task later; skip one-off trivia.

## Disposition Vocabulary

- `delete`, `kill`, `stale`: remove the task. Do not preserve it as completed. Do not invent a reference unless Igor explicitly says the source is still useful.
- `done`: move to `completed/` in the same root. Do not edit the body to say "done" or explain completion; the bucket already says it.
- `public backlog <priority>`: move to `tasks/backlog/` with that priority and keep the task shape minimal.
- `public tech ref`: move to `tasks/references/` with `tech`. Preserve the useful source/content. Do not manufacture a task around it.
- `ref for <existing topic/task>`: add a named link or compact note to that existing task, then delete the source unless the source must remain independently browsable.
- `flat`, `fold`, `merge`: move the smallest useful content/link/media into X in the natural place, then delete the source.
- `brainstorm`: keep private inbox, add `brainstorm`, and otherwise leave it alone for later review.

## Bucket Heuristics

- `completed/` is history for achieved work only. Touch it rarely.
- Rejected, obsolete, or "won't do" work should be deleted, not moved to completed.
- `references/` is source/context, not completable work. A reference can be raw or synthesized depending on the source and Igor's instruction.
- `ideas/` is for product ideas, side projects, use cases, and things to try. `ticktick-status:use-case` maps here.
- `inbox/` is for untriaged capture. `ticktick-status:user-interface` stays inbox until reviewed.
- Once an inbox task has been reviewed, it should almost never remain in inbox. Move it to the best public/private bucket; if the destination is unclear, ask Igor instead of parking it in inbox.
- `active/` is for work being pursued now. Do not leave stale active tasks around once they are done or deferred.
- Grouping-only folders should be flattened when tags and Organizer filters carry the organization better.
- Keep folder tasks with `_index.*` when the folder is a real parent task, a real reference collection, or owns real subtasks/attachments.

## Public And Private

- Raw TickTick, phone, personal, and ambiguous captures default private until reviewed.
- Meseeks product/repo work should become public when it is safe and useful for the main monorepo.
- Product ideas, names, and positioning captures are not automatically private. Decide from the content and Igor's disposition, not from the fact that they are early ideas.
- If Igor says a private reviewed item can be public, move it into `tasks/` after checking the content and attachments for obvious sensitive material.
- Moving private material public requires a content review. Watch for account data, local paths, private business context, credentials, personal notes, or sensitive screenshots.
- Igor's email and ChatGPT share URLs are not sensitive by themselves. Judge the content behind them, not the URL shape.
- If a task mixes public work with private context, split it: public task in `tasks/`, private source/reference in `private/tasks/`.
- Do not change public/private visibility when Igor gives a mechanical disposition that does not mention visibility. Example: a private task marked done goes to private completed.

## Tags

- Tags should be short, reusable, and useful in Organizer. Avoid vendor/model/one-off tags unless they are source namespaces such as `source:ticktick`.
- Preserve TickTick traceability: `source:ticktick`, `ticktick-list:*`, and `ticktick-status:*` when known.
- `source:*` is for where a task came from. `source:ticktick`, `source:safari-reading-list`, etc.
- `scraped` marks captures expanded from a link or raw source.
- `tech` marks technical references broadly. It does not mean the reference must stay raw.
- `ux` marks interface/design/product-experience material. It can coexist with `tech` for technical references that shape UI feel, such as smooth corners, animations, layout helpers, or component collections.
- `demand` marks market-demand signals. Demand references usually stay raw because the signal itself is the artifact.
- `intelligence` is only for AI model/model-provider support tasks.
- `skill` is for skills/integrations we want to add to Meseeks.
- `legacy` is for pre-Reactor-v1 work kept as useful context until Reactor v1 supersedes or revalidates it.
- `brainstorm` is for private inbox idea captures to revisit later. Will usually be split into a public idea task later.
- `vfs` is virtual filesystem/Reactor filesystem material; skip it during broad inbox classification unless Igor asks.
- Do not add tags that repeat the title, bucket, source label, or one imported task's accidental wording.

## Reactor V1

Reactor v1 is the critical path. Fold small core-engine notes into the Reactor v1 task instead of preserving many tiny imported tasks.

Use Reactor v1 for:

- task/action/reaction/execution semantics
- synchronous actions and multiple tool-call / multi-action execution
- `instruct()` / `plan()` / task body / task plan naming and state model
- `updateInstructions()` diffs, versioning, persisted history, and "show AI/humans what changed"
- learning, confidence, double-checking, and reasoning-token accounting
- energy/cost/budget behavior, skill costs, provider credits, and per-task accounting
- authorization triggers, domain allowlists, and action safety gates
- ETH deposits into user/task wallets, not checkout-style payments
- filesystem/runtime primitives, virtual filesystem alternatives, and local provider mechanics when they are core execution architecture
- `searchWeb` taking multiple queries at once

Do not keep empty shells that only restate a Reactor concept. Fold the exact useful line into Reactor and delete the shell.

## Pro GTM

Pro GTM is the aggregation target for launch and public-beta shape.

Use Pro GTM for:

- mission and positioning, especially the anger against vendor lock-in
- public beta / v1 narrative
- pricing, including the simple fixed markup on deposits direction
- SEO, articles, public docs, docs pages, and launch content
- onboarding and risk/terms acceptance when framed as go-to-market/product readiness
- "why Meseeks", category language such as Pro/Web4, and data/UI splitting apart
- launch video ideas, "one exceptional thing" MVP notes, and public messaging insights

Flatten into the existing GTM task. Do not create separate launch/SEO/onboarding shards unless the work is independently actionable now.

## Security

- DeepSec/scanner reports belong in public references. Concrete tasks created from them should be public backlog tasks that link to the report.
- Do not group security/accountability findings just to keep them together. Split into standalone tasks with specific titles, priorities, and tags.
- Security work can be public unless the source contains sensitive private context.
- Use `legacy` for security/accountability issues that belong to the current architecture and may disappear after Reactor v1.
- External product security UI examples, such as connector warning screens, are references unless Igor explicitly says they define Meseeks work.

## References

- References are for source/context that should be searchable but is not itself completable.
- Public technical material usually belongs in `tasks/references/` with `tech`.
- ChatGPT/OpenAI product-behavior, metadata, prompt-injection, and leaked-system-prompt captures are public `tech` references unless the captured content itself exposes Igor/private data.
- Raw vs synthesized depends on the source. Keep demand references raw. For technical references, preserve the useful source and add synthesis only when it helps future work.
- UI/UX inspiration from third-party products, component libraries, plugins, and visual polish techniques can become public references with `ux` when it is design material.
- If a reference is just there to support an existing task, link it from that task instead of creating a standalone file.
- Prefer named Markdown links in prose: `[CDP Wallets](https://...)`. Bare URLs are fine when preserving a raw source list or the URL itself is the artifact.
- Names should not repeat context. A task in `references/` does not need "reference" in the title.

## Link, Media, And Import Handling

- Expand or scrape link-only tasks before planning/review. Keep the original link, add local context, and give the task a semantic title.
- Do not replace semantic titles with hashtags or delete the original link.
- For `to-read`, the link is often the task. Expand enough for search and title clarity, but do not over-organize it unless that specific item is reviewed.
- When flattening imported tasks, do not keep generic `Source`, `TickTick source`, raw JSON, "source capture preserved", or "merged source note" blocks. Git history carries routine provenance.
- Preserve useful links, media, quotes, screenshots, and decisions in the target task body.
- Preserve Igor's short original keywords/intent when converting imports into references; they often explain why the source mattered better than the scraped summary does.
- If important attachments/media move into a target task, move the actual file too and update the Markdown so it renders.
- Tasks with local attachments should usually be folder tasks: `slug/_index.md` plus `slug/attachments/*`.
- TickTick child rows that are real subtasks should become real local subtasks under the parent folder, not only rendered checklist text.

## Merge And Rewrite Style

- When merging captures into an existing task, put the useful content in the natural location. Avoid "merged source notes" sections.
- Keep original context when it may matter. If unsure, paste original content under a compact separator rather than paraphrasing away detail.
- Do not add boilerplate like "reference capture", "source preserved", "done already", or "examples from original task" when the bucket/history already says enough.
- Do not start task bodies with a default `## Context` heading. Start directly with the content unless structure genuinely helps.
- If a rename changes the meaning, update the filesystem slug/folder too.
- Keep task prose dense. Searchability matters, but repeated contextual labels are clutter.

## Skip During Broad Classification

- Skip `funding` unless Igor asks.
- Skip `to-read` unless Igor asks.
- Skip `vfs` unless Igor asks.
- Leave `brainstorm` items private inbox for a later idea review.

## Learned Examples

- Grok 4.2 and Grok 4.3 support are separate public low-priority `intelligence` tasks. The work is "add support", not "evaluate".
- `valyu-search-provider` was a private done item; move to private completed, not public.
- Coinbase Onramp API was a reference for ETH deposits; mention it inside the Reactor ETH deposits section, do not keep a standalone file.
- CDP Wallets is also a candidate link under ETH deposits; keep it as a named link, not a paragraph of invented justification.
- `Context URL now GA in Gemini API` belongs under the scraping task as another scraping option.
- Local model provider vision belongs in the macOS app/provider task: the app itself is the provider, not a background daemon.
- Human-as-a-Service is an idea task; external examples can be links inside it.
- Public tech references from Vercel MCP adapter, Gemini system prompt, Pliny prompt injection, browser automation CLI, etc. should be references with `tech`.
- Skill backlog examples: WhatsApp skillset, Serper search, Exa/search provider skill, public-profile lookup. Default public backlog low unless specified.
- `WebSquare` remains meaningful in the Feeds idea; preserve the full WebSquare content when organizing that task.
- Feeds are user-owned streams that can follow people, organizations, topics, repos, sites, or personal sources, with AI and code filters.

## Current State Notes

- 2026-05-11 Unclutter moved open Meseeks TickTick imports by preserved TickTick board status.

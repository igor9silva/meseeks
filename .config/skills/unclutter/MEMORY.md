# Unclutter Memory

Durable decisions for future Unclutter passes. Keep this short; this is the persistent history.

## Decisions

- Read `tasks/README.md` as the task-system contract before changing tasks.
- Check `git status --short` first and ask Igor before continuing on top of a dirty worktree.
- Never stage, commit, amend, reset, or otherwise mutate Git review state.
- Touch `completed/` rarely. Completed tasks are mostly history.
- Preserve TickTick tags and source metadata. TickTick imports should carry `source:ticktick`, `ticktick-list:*`, and `ticktick-status:*` when known.
- TickTick child task rows should be real local filesystem subtasks under the parent task folder, not only a rendered checklist in the parent body.
- `ticktick-status:use-case` maps to the `ideas/` bucket.
- `ticktick-status:user-interface` stays in `inbox/` for triage.
- The root side-project directory is `ideas/`, not `side/`.
- DeepSec and scanner reports belong in public `references/`; concrete tasks created from them should be standalone public tasks that link back to the reference.
- Keep nested folders with `_index.*` when they are real parent tasks or reference collections.
- Flatten grouping-only folders when tags or Organizer filters carry the organization.
- Reactor v1 is the main critical path. It includes the new core execution engine plus the broader v1/public-beta shift: pricing/accountability, branding, and product readiness.
- Current/v0 implementation references can live as children of a parent task when they are source material for that parent.
- Before deciding an implementation task is stale, read the current code path named by the task.
- Do not group security/accountability findings just to keep them together. Split them into standalone public tasks with clear tags and priority.
- Use the `legacy` tag for pre-Reactor-v1 work that is still useful context but likely becomes obsolete when Reactor v1 replaces the current architecture.
- Actionable security work belongs in public `tasks/backlog/` unless there is a specific sensitive source note that must stay private.
- Use the `skill` tag for skills/integrations we want to add to Meseeks. Flatten imported skill/topic folders into individual skill-tagged tasks instead of preserving a `skills/` grouping folder.
- Mostly-link inbox captures should have their links expanded or scraped before planning; preserve the original links and source metadata near the expanded content.
- External product security UX examples, like ChatGPT unverified connector warnings, are references unless they explicitly define Meseeks work.
- Use `demand` for public demand signals that validate Meseeks. Store those as public references unless they directly define work.
- Before presenting every review batch, expand or scrape tasks that are just links or mostly links so the batch can be judged from local disk context.
- `private/tasks/active/migrate-ticktick/` is the canonical parent for the current task-system organization plus TickTick migration effort. Keep useful organize reports/import receipts under it instead of root `organize.md` / `organize/*`.
- Completed TickTick task import belongs under the private TickTick migration parent and must preserve activity/history before importing.
- `tasks/backlog/mdx-agent-skills.mdx` is a low-priority public idea, not active work.
- Grok 4.2 and Grok 4.3 support are separate public low-priority intelligence tasks; do not merge them.
- Use `intelligence` only for AI model/model-provider support tasks, not generic UX around model selectors.
- Imported aggregation parents with no real body should be removed after their children are classified.
- Useful image-only UI imports can become references when they are design inspiration; kill outdated UI references.
- Reactor v1 must preserve synchronous actions and multiple tool-call / multi-action execution as first-class behavior.
- Empty imported shells that only point at Reactor v1 concepts should be folded into Reactor v1 and deleted.
- Versioning, persisted diffs, and core execution posture notes belong in Reactor v1 unless they are already concrete implementation tasks.
- When moving private tasks public, review for private account data, local paths, and sensitive source material. Igor's public email and ChatGPT share URLs are fine by themselves; judge the content, not the URL shape.
- Add a prominent disclaimer to any reviewed task that still needs sensitive material kept in public.
- Third-party UI/product references can be public references with no priority and no tags when the reference itself is the only useful artifact.
- When merging captures into an existing task, put the useful content in the natural body location. Avoid "merged source notes" blocks unless provenance itself is the useful content.
- When flattening imported tasks, do not keep generic `Source`, `TickTick source`, raw JSON, "source capture preserved", or "merged source note" blocks. Keep useful links, media, quotes, and decisions in the target body; routine provenance lives in git history.
- When flattening tasks with attachments, copy or move the actual attachment into the target task's attachment area and update the body so images/videos render from the target. Do not leave important media orphaned in a deleted source task.
- Link-only tasks should be expanded before review. Keep the original link, add local context, and replace URL-only titles with semantic titles. Do not replace titles with hashtags or delete the link.
- For `to-read` tasks, the link is often the task. Expand enough for local search and a semantic title, but do not over-organize or remove them from the to-read flow unless Igor explicitly reviews that item.
- During broad inbox classification/review, skip `funding` and `to-read` groups unless Igor explicitly asks to review them.
- Use `brainstorm` for captures Igor wants to keep in private inbox for later ideation. Do not move or rewrite those during mechanical cleanup.
- User onboarding decisions belong inside the Pro GTM/v1 task unless there is a concrete implementation task.
- Do not wrap task bodies in a default `## Context` heading. Start directly with the content unless a section heading adds real structure.
- Names should be context-based and should not repeat the bucket. A file in `references/` does not need "reference" in its title; a task in `ideas/` does not need to say it is an idea unless that is the actual name.
- Keep `WebSquare` as a likely name/vision for the Feeds idea. Feeds are user-owned streams that can follow people, organizations, topics, repos, sites, or personal data sources, with AI filters and code filters.
- Demand signals are references by default. Use the `demand` tag and choose public/private based on sensitivity, not on whether the source URL is public.
- Pro GTM is the aggregation target for launch, mission, positioning, pricing, public docs, SEO, onboarding, and category-language notes. Keep the anger against vendor lock-in explicit; it is part of the mission, not noise.
- Pricing direction for Pro GTM: simple fixed markup on deposits, with 2% as the working example; the wallet should pay for models, sandboxes, storage, skills, providers, and future human work.
- Reactor v1 is the aggregation target for ETH deposits, wallet/accounting mechanics, authorization triggers, domain allowlists, versioning, persisted diffs, and core execution semantics.
- ETH work should be framed as deposits into the user/task wallet, not checkout-style payments. CDP Wallets are a candidate implementation path.
- Ideas like human-as-a-service belong in `ideas/` unless they become concrete product work. Research existing similar products before writing them as novel greenfield concepts.
- After every collaborative review batch, remove reviewed items from the classification/control document and update this memory with any reusable correction before moving on.

## Current State Notes

- 2026-05-11 Unclutter moved open Meseeks TickTick imports by preserved TickTick board status.

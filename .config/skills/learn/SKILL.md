---
name: learn
description: Extract lessons from conversation mistakes and update project rules, skills, and relevant tasks to prevent recurrence. Use when the user says "learn" or "/learn", asks to update rules from mistakes, or wants to capture lessons from a completed task.
---

# Learn from Mistakes

Review the full conversation, identify every place where the user corrected the model, and update `.config/MasterPlan.md`, `.config/skills/`, and relevant task files so the same mistakes never happen again and concrete follow-up work does not disappear.

## Step 1: Scan the conversation

Read every message in the conversation. Look for signals that the model made a mistake:

- User asked to undo, revert, or fix something the model did
- User expressed frustration or said the model was wrong
- User had to re-explain something
- User pointed out leftover artifacts, dead code, or incomplete changes
- User said "that's not what I asked" or similar
- User manually did something the model should have done
- User explicitly said an existing behavior/location/label was correct or "perfect", and the model changed it anyway

If the thread was compacted, read the compaction summary first and look for a `Learn hints` section. Treat those hints as preserved evidence, not optional flavor text.

If the Codex app does not expose this skill, do not assume learning is blocked. Check the repo-local source at `.config/skills/learn/SKILL.md` and follow it manually.

Treat each user message as potentially meaningful. When compaction drops verbatim text, recover at least:

- what the user was trying to get done
- why they steered or corrected the model
- what assumption, omission, or drift caused the miss

Build a skill review queue from all skills under `.config/skills/`, not just the skills invoked in this conversation.

Build a task review queue from the task(s) directly involved in the conversation plus any clearly related existing tasks you find with a focused search. Do not trawl the whole task tree unless the user explicitly asked for a broad task review.

Track which skills were invoked, but do not limit analysis to them. A skill needs changes if:

- It produced wrong output, missed steps, or had bad instructions
- The user had to override, work around, or redo something the skill guided
- The skill's documented behavior didn't match what actually happened
- The skill was missing a capability that would have prevented a mistake
- The conversation revealed a durable preference the skill should encode, even if that skill was not invoked

For each mistake found, extract:

1. **What happened** — the specific bad behavior
2. **Why it was wrong** — what the user expected instead
3. **Root cause** — the general pattern behind the mistake (not the specific instance)
4. **Evidence** — the concrete user correction/steering message that proves the mistake happened
5. **Skill involvement** — if a skill contributed to the mistake, note which one and how
6. **Task impact** — whether the lesson should change tracked work, such as scope, acceptance criteria, notes, or a missing follow-up task

Before editing, check whether the requested lesson is already covered. If it is covered and no wording needs tightening, tell the user it is already handled and stop. Do not continue into broader cleanup just to produce changes.

### Generalizing properly

This is the critical part. Don't write rules about the specific code that was wrong. Write rules about the _class of mistake_.

**Bad** (too specific): "When removing a header from `generateOpenCodeRules`, also remove the intermediate variable"
**Good** (general): "When removing code, review surrounding context for leftover artifacts (dead variables, unnecessary wrappers, orphaned blank lines)"

**Bad** (too specific): "Don't leave `const opencodeRulesContent` when simplifying the function"
**Good** (general): "Clean up the full impact of every change, not just the literal lines requested"

Ask yourself: "If I saw a completely different codebase with a similar mistake, would this rule still prevent it?" If no, generalize further.

### prefer examples over abstract wording

When adding or tightening rules, prefer concise examples over abstract-only phrasing.

- If a rule could be interpreted in multiple ways, include a short `bad`/`good` pair.
- Keep examples minimal and representative of the behavior you want to change.
- Do not add examples when the rule is already unambiguous and the example adds noise.
- Use examples to create emphasis. Like when you already had a rule, but it still failed.

### qualify mistakes before adding rules

Bias toward signals where the user had to correct, redirect, or steer the model.

Do **not** add a rule when:

- The model already followed the correct behavior

Do add or update rules for explicit user preferences when the preference is durable (conventions, naming, process expectations) and capturing it will improve future behavior.

When context is compacted or partially missing, use the best available signals and avoid inventing facts. Do not block useful rule updates only because confidence is not perfect. Make the confidence limit explicit so `learn` can catch it.

## Step 2: Read and critique current rules

Read the full `.config/MasterPlan.md` file. Never assume it's properly written or efficient — it was built incrementally and may have accumulated cruft, weak wording, or missed opportunities.

Look at it with fresh eyes every time:

- Are existing rules clear enough to actually prevent mistakes, or are they too vague?
- Are there redundant or overlapping rules that should be merged?
- Is the structure logical, or would reorganizing make it easier to follow?
- Are there rules that could be tightened or expressed more directly?
- Does the tone and style stay consistent throughout?

Improve rule quality where it affects the identified lesson or invoked workflow. Do not edit unrelated sections just because they could be nicer; bonus churn is still churn, and the user did not ask for it.

## Step 3: Update rules

Open `.config/MasterPlan.md` and apply changes. For each lesson learned:

1. **Already covered?** — skip it, or strengthen the wording if the current version wasn't clear enough to prevent the mistake
2. **Fits an existing section?** — add it there
3. **New category?** — create a new section in a logical position, matching the file's existing structure and conventions

### Rule placement boundary (avoid duplication)

Decide where each lesson belongs before editing:

- Put cross-cutting behavior in `.config/MasterPlan.md` (applies across many tasks/skills).
- Put workflow-specific behavior in the relevant skill under `.config/skills/*/SKILL.md`.
- Put concrete follow-up implementation work in task files.
- Do not copy the same operational guidance into both files.
- If multiple outputs must change, keep MasterPlan as a short principle, keep concrete workflow steps/examples only in the skill, and keep actionable execution work in tasks.

Examples:

- bad: add task-file naming minutiae to both MasterPlan and `create-task` with near-identical wording
- good: keep detailed task-file naming rules in `create-task`; keep only a generic non-duplication principle in `learn`

### quality check for rule changes

Use this as a lightweight checklist (not a hard gate):

1. It improves future behavior in a meaningful way
2. It is grounded in user correction/steering or explicit user preference from this conversation
3. It addresses root cause and is scoped enough to avoid over-correcting unrelated work
4. It includes concise examples when examples would materially reduce ambiguity
5. It is not a duplicate of guidance already captured in a more specific skill

### Keeping the file concise

After making changes, review the entire file for:

- **Redundant rules** — merge or deduplicate
- **Rules that are subsets of other rules** — remove the narrower one if the broader one is clear enough
- **Overly verbose sections** — tighten the wording
- **Rules the model would follow anyway** — remove obvious ones that don't need stating

If the file would be cleaner rewritten from scratch, do it. Preserve all existing rules that are still relevant, but reorganize and tighten freely.

### Constraints

- Do NOT delete rules unless they're genuinely redundant, superseded, or wrong — reword or merge instead
- Do NOT add rules that are just common sense for any competent developer (e.g., "test your code")
- Do NOT add rules so specific they'll never apply again

## Step 4: Update skills

Review all skills under `.config/skills/` on every `learn` run. Do not limit this step to invoked skills.

For each skill, decide one of: no change, tighten wording, add missing guidance, or remove stale guidance. Make edits only when they improve future behavior.

### What to look for

Read `SKILL.md` for every skill in `.config/skills/`. Compare what each skill tells the model to do vs. what this conversation proved the user expects. Look for:

- **Wrong instructions** — steps that led to incorrect behavior
- **Missing steps** — gaps the user had to fill manually
- **Outdated information** — references to APIs, paths, or patterns that have changed
- **Missing edge cases** — scenarios the skill didn't account for
- **Unclear wording** — instructions that were ambiguous enough to cause a wrong interpretation
- **Preference drift** — durable user preferences from this conversation that should be codified in the skill even if it was not invoked

### Where to edit

Only edit skill files under `.config/skills/` — these are the source of truth. All other skill paths (`.agents/skills/`, etc.) are codegenerated and will be overwritten.

### review method

1. Enumerate all skill directories under `.config/skills/`.
2. Read each `SKILL.md` and assess whether this conversation exposes a gap or improvement.
3. Update only the skills where a change would prevent future mistakes or capture durable preferences.
4. Leave explicitly unchanged skills untouched (no churn edits).

### How to update

Apply the same principles as rule updates:

- Fix the root cause, not the symptom
- Keep the skill's existing structure and tone
- Don't bloat — if a one-line fix prevents the mistake, that's enough
- If the skill's self-improvement section encourages edits (like `scrape-content` does), lean into it
- If the skill was fundamentally fine and the mistake was a general model behavior issue, update rules instead — don't duplicate guidance across rules and skills

### When NOT to update a skill

- The skill is already aligned with current expectations and no wording improvement is needed
- The issue is purely a general model behavior problem better handled in `.config/MasterPlan.md`
- The fix would be so specific it would never apply again

## Step 5: Update tasks

Rules and skills change future behavior. Tasks track concrete follow-up work. `learn` should update tasks when the lesson changes planned work, not just because a task file exists nearby.

Before touching any task file:

1. Read `files/README.md`.
2. If touching task tags, read `files/TAGS.md`.
3. If touching a subtask, read the parent `_index.*` chain.
4. Prefer updating an existing relevant task over creating a duplicate.
5. If creating or materially reshaping a task, follow `.config/skills/create-task/SKILL.md`.

### When to update an existing task

Update an existing task when the conversation:

- Clarified scope, acceptance criteria, constraints, or next steps
- Revealed a missing subtask, risk, or note that belongs in tracked work
- Changed status or priority in a way that should be preserved
- Produced progress worth recording in `## Progress Log`

Keep task updates concrete:

- tighten `Objective`, `Subtasks`, `Notes`, or `Progress Log`
- add a dated progress entry explaining why the task changed
- rename the task file only when the task intent materially changed

### When to create a new task

Create a new task only when all of these are true:

- There is durable unresolved repo work
- The work is specific enough to be actionable now
- No existing task already owns it
- Capturing it only in rules/skills would lose important implementation follow-up

Examples:

- bad: create `learn from this mistake later`
- good: create `tighten learn task-selection rules and update summary output`

### When NOT to touch tasks

- The lesson is fully handled by rule/skill edits
- The conversation surfaced only a one-off preference with no concrete follow-up work
- The task idea is vague, speculative, or duplicative

## Step 6: Summary

Tell the user:

- How many mistakes were identified
- What rules were added, modified, or merged
- Whether any existing rules were tightened or reorganized
- How many skills were reviewed, which skills were updated (if any), and what changed
- How many task files were reviewed, which tasks were updated or created (if any), and why
- Which candidate lessons were skipped (if any) because they were already covered or would not change behavior
- Which candidate task updates were skipped (if any) because they were vague, duplicative, or already captured elsewhere
- If the thread was compacted, include a short **Compaction Notes** line stating whether `Learn hints` were present, which preserved steering/learning cues were used, and any missing context that could limit confidence
- Which example-based rules/examples were added (or why none were needed)

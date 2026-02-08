---
name: learn
description: Extract lessons from conversation mistakes and update project rules to prevent recurrence. Use when the user says "learn", asks to update rules from mistakes, or wants to capture lessons from a completed task.
---

# Learn from Mistakes

Review the full conversation, identify every place where the user corrected the model, and update `.config/rules.md` so the same mistakes never happen again.

## Step 1: Scan the conversation

Read every message in the conversation. Look for signals that the model made a mistake:

- User asked to undo, revert, or fix something the model did
- User expressed frustration or said the model was wrong
- User had to re-explain something
- User pointed out leftover artifacts, dead code, or incomplete changes
- User said "that's not what I asked" or similar
- User manually did something the model should have done

For each mistake found, extract:

1. **What happened** — the specific bad behavior
2. **Why it was wrong** — what the user expected instead
3. **Root cause** — the general pattern behind the mistake (not the specific instance)
4. **Evidence** — the concrete user correction/steering message that proves the mistake happened

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

When context is compacted or partially missing, use the best available signals and avoid inventing facts. Do not block useful rule updates only because confidence is not perfect. Make it explict so learn() can catch it.

## Step 2: Read and critique current rules

Read the full `.config/rules.md` file. Never assume it's properly written or efficient — it was built incrementally and may have accumulated cruft, weak wording, or missed opportunities.

Look at it with fresh eyes every time:

- Are existing rules clear enough to actually prevent mistakes, or are they too vague?
- Are there redundant or overlapping rules that should be merged?
- Is the structure logical, or would reorganizing make it easier to follow?
- Are there rules that could be tightened or expressed more directly?
- Does the tone and style stay consistent throughout?

Improve anything you find, even if it's unrelated to the current session's mistakes. The goal is to leave the file better than you found it every time. Don't be afraid to make changes — the user reviews all diffs before committing.

## Step 3: Update rules

Open `.config/rules.md` and apply changes. For each lesson learned:

1. **Already covered?** — skip it, or strengthen the wording if the current version wasn't clear enough to prevent the mistake
2. **Fits an existing section?** — add it there
3. **New category?** — create a new section in a logical position, matching the file's existing structure and conventions

### quality check for rule changes

Use this as a lightweight checklist (not a hard gate):

1. It improves future behavior in a meaningful way
2. It is grounded in user correction/steering or explicit user preference from this conversation
3. It addresses root cause and is scoped enough to avoid over-correcting unrelated work
4. It includes concise examples when examples would materially reduce ambiguity

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

## Step 4: Summary

Tell the user:
- How many mistakes were identified
- What rules were added, modified, or merged
- Whether any existing rules were tightened or reorganized
- Which candidate lessons were skipped (if any) because they were already covered or would not change behavior
- If the thread was compacted, include a short **Compaction Notes** line listing preserved steering/learning cues and any missing context that could limit confidence
- Which example-based rules/examples were added (or why none were needed)

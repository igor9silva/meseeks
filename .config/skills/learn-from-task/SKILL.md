---
name: learn-from-task
description: Read a full Meseeks task conversation from Convex MCP, especially when the user says Learn from task, asks to read a /task/ URL, references a PROD task, or wants project instructions improved from a prior task failure. Use this to recover the original user intent, assistant visible say() output, internal action/debug timeline, and steering corrections, then update MasterPlan, skills, or task files so the mistake does not repeat.
---

# Learn from task

Use this skill to learn from a completed Meseeks task, not from the current chat alone.

## Core Rule

Read the whole task before changing rules. The useful evidence is often split across user `say` actions, assistant `say` actions, `reason` actions, `updateInstructions` actions, and final `done` summaries.

## Workflow

### 1. Confirm Source And Scope

- Extract the task id from paths like `/task/<id>`.
- If the user says `PROD`, target the production Convex deployment.
- Do not mutate production data. Use read-only MCP tools such as `status`, `tables`, `functionSpec`, `data`, and `runOneoffQuery`.
- If MCP access is unavailable, inspect `.config/mcp.config.ts` and `.codex/config.toml`, then use the direct project Convex MCP command. If that still fails, stop with concrete options instead of guessing.

### 2. Pull The Full Conversation

Read at least:

- `tasks`: title, instructions, summary, status, preferred intelligence, available skills
- `actions` by `taskId`, ordered ascending by `_creationTime`
- `action_details` by `actionId` for soft/hard execution metadata

For each action, preserve:

- action id and creation time
- `skillKey`, `status`, `depth`, and `author`
- full `args` for `say`, `updateInstructions`, `reason`, and `done`
- visible assistant/user `result.text`
- LLM detail fields: model, finish reason, text, tool calls, history length, and system instruction length

Do not read only the final task summary. It is usually too lossy for learning.

### 3. Reconstruct The Failure

Build a short timeline:

- initial user request
- first assistant-visible `say()` output
- user steering/corrections, quoted exactly when useful
- later answer that satisfied the user
- internal reasoning that shows the model already knew the right answer but failed to present it

Extract lessons as:

- what happened
- why it was wrong
- expected behavior
- root cause class
- concrete evidence from the task
- affected surface: MasterPlan, skill, task file, or no persistent change

### 4. Apply Learn Discipline

Load `.config/skills/learn/SKILL.md` and follow its rule-quality checks.

Default placement:

- Cross-cutting assistant behavior goes in `.config/MasterPlan.md`.
- Workflow-specific behavior goes in `.config/skills/<skill>/SKILL.md`.
- Concrete unresolved repo work goes in `files/` or `private/files/`.

Hard boundaries:

- Do not edit `AGENTS.md`; it is generated from `.config/MasterPlan.md`.
- Do not edit `.agents/skills`; they are generated from `.config/skills`.
- Do not run the config generator unless the user explicitly asks.
- Do not create a task if the rule/skill edit fully captures the lesson.
- Do not duplicate the same rule in MasterPlan and a skill.

### 5. Write The Patch

Prefer small, example-driven rules that prevent the root cause without overfitting to one task.

Good rule shape:

- principle first
- one or two sharp bullets
- concise `bad`/`good` example if ambiguity caused the miss
- note when an example is about behavior shape, not permanent facts

Bad rule shape:

- broad scolding like "be better"
- a one-off fact hardcoded as policy
- a giant transcript pasted into instructions
- a task created just to remember that learning happened

### 6. Verify

Run:

```bash
python3 /Users/igor/.codex/skills/.system/skill-creator/scripts/quick_validate.py .config/skills/learn-from-task
git diff -- .config/MasterPlan.md .config/skills files private/files
```

If the validator fails only because `PyYAML` is unavailable, do not install anything just for this. Use the bundled Node runtime and `yaml` package to check frontmatter instead.

Run extra validation only if code or generated artifacts changed.

## Final Response

Report:

- task read source: MCP deployment and task id
- number of root mistakes found
- files changed
- skills reviewed and updated
- task files reviewed and updated, or why none changed
- skipped candidate lessons/tasks and why
- validation run

If writing a handoff or compaction, include `Learn hints` with the key steering evidence and the model assumption that failed.

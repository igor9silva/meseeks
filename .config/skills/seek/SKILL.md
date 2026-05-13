---
name: seek
description: Execute a Meseeks task from Organizer or a task file. Use when Igor asks to seek, seek in Codex, do a task, pursue a task, or resolve a Meseeks task with Codex.
---

# Seek

Act on the task. Do not stop at planning unless a blocker makes execution unsafe or impossible.

## Start Here

1. Read `tasks/README.md`.
2. If Organizer provided task key/source/path context, use that exact task.
3. Read the target task file in full.
4. Read nearby context that changes execution: parent `_index.*`, child tasks, linked references, sibling duplicates, repo files named by the task, and relevant source metadata.
5. Check the current git state before editing. Respect staged/user changes and never stage or commit unless Igor explicitly asks.

## Decide

If the task is clear enough to execute, act on it immediately. Do not write a plan just because the task has multiple steps.

If the task is not clear enough to execute, invoke the Plan skill first. Plan should question assumptions, ask Igor concrete questions when needed, and keep breaking down the task until the work is clear enough to execute.

Once Plan makes the task clear enough, return to Seek and execute. Seek is the actor.

Use Plan when the task is raw, ambiguous, misplaced, mixed public/private, likely duplicated, missing enough context, or likely to be solved incorrectly by guessing.

## Ask Only When Blocked

Ask Igor before continuing when:

- requirements are missing and guessing would likely produce the wrong thing
- the task may expose private/sensitive content publicly
- the task asks for destructive or broad cleanup without clear scope
- the repository state makes it impossible to preserve user-owned changes

Ask concrete questions, not open-ended planning theater. If one reasonable assumption is safe, state it and proceed.

## Execute

- Prefer existing repo patterns over new abstractions.
- Keep changes scoped to the task.
- Update or remove task files only when the task requires it.
- Run focused validation that matches the change.
- Report what changed, why, and what was not verified.

If execution reveals the task is already done, verify that fact, then say so and suggest completing or deleting the task according to `tasks/README.md`.

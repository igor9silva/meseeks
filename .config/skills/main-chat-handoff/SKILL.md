---
name: main-chat-handoff
description: Turn a completed side-chat discussion into one paste-ready prompt for the main chat. Use when Igor asks for a prompt, handoff, copy-paste instruction, or main-thread message after using a side conversation to debate, inspect, or decide implementation details.
---

# Main Chat Handoff

Produce the exact text Igor can paste into the main chat. The main chat has no side-chat context, so the prompt must be self-contained, settled, and actionable.

## Workflow

1. Read the recent side-chat discussion and identify the final settled instructions.
2. Separate decisions from exploration. Keep decisions; drop discarded options, debate history, and side-chat provenance.
3. Convert conclusions into direct imperatives for the main chat.
4. Make the prompt contextless: include names, paths, API boundaries, invariants, and acceptance criteria needed to act without knowing this side chat existed.
5. Output only the prompt text. Do not introduce it with "use this", "paste this", or similar wrapper text.

## Rules

- Do not ask the main chat to redo research already completed in the side chat.
- Do not say "likely", "probably", "maybe", "if needed", or similar hedges for settled conclusions.
- Do not mention experimental branches, previous checks, or side-chat evidence unless Igor explicitly wants that in the prompt.
- Do not tell the main chat to "check X for reference" when the side chat already checked X and reached a decision.
- Do not include implementation search commands unless Igor asks for verification commands in the prompt.
- Do not wrap the whole prompt in a Markdown code block. Do not use any code blocks.
- Do not repeat the same rule in multiple sections.
- Do not include verification commands; this is main chat's concern.
- Preserve Igor's exact requested names, paths, statuses, route names, file paths, literals, and vocabulary.
- If something is unresolved, either ask Igor before producing the handoff or mark it explicitly as a question for the main chat. Do not smuggle uncertainty into requirements. Assume it'll be blindly pasted.

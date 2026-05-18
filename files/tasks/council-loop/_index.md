---
title: Council loop
priority: low
tags: [loop, scraped, source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, status:backlog, class:task]
---

Design a loop where Meseeks can assemble a small council of model perspectives around one task, compare their answers, let them critique each other, and synthesize a final answer or next action.

The useful shape from Karpathy's `llm-council` experiment:

1. Send the same user query to multiple council models.
2. Show the first-pass answers side by side so the user can inspect disagreement.
3. Feed anonymized peer answers back to the models so each model reviews and ranks the others by accuracy and insight.
4. Give those answers and reviews to a chair model that writes the final response.

For Meseeks, this is a loop design, not just a multi-model chat. The interesting product behavior is disagreement, ranking, synthesis, and a trace the user can inspect.

Source expansion:

- [Levan Kvirkvelia quote tweet](https://x.com/levankvirkvelia/status/1992444146712543317?s=12), 2025-11-23: "Your life should get this screen." The attached image from that post is not relevant here.
- [Andrej Karpathy tweet](https://x.com/karpathy/status/1992381094667411768), 2025-11-22: Karpathy describes a local `llm-council` app where each query is dispatched through OpenRouter to several models, then models review and rank one another's anonymized responses, then a chair model produces the final response.
- [karpathy/llm-council](https://github.com/karpathy/llm-council): local web app using OpenRouter. README describes the same three stages: first opinions, peer review, final chair response. The repo is explicitly a vibe-coded Saturday hack, useful as inspiration rather than a dependency.
- Related Karpathy context: [reading with LLMs](https://x.com/karpathy/status/1990577951671509438), 2025-11-18. He describes reading material with LLM passes: manual read, explain/summarize, then Q&A. That is the use case that led into the council experiment.

---
title: "Smithers durable JSX AI workflow"
tags:
  - source:ticktick
  - ticktick-list:inbox
  - class:reference
  - tech
---

https://smithers.sh
interesting reference for JSX/react usage with AI.

```tsx
/** @jsxImportSource smithers-orchestrator */
import { createSmithers, Sequence, Task } from "smithers-orchestrator";
import { z } from "zod";

const { Workflow, smithers, outputs } = createSmithers({
  hello: z.object({ message: z.string() }),
});

export default smithers((ctx) => (
  <Workflow name="hello">
    <Sequence>
      <Task id="greet" output={outputs.hello}>
        {{ message: `Hello, ${ctx.input.name}` }}
      </Task>
    </Sequence>
  </Workflow>
));
```

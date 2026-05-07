# Vulnerability Scan Report

| Field | Value |
|-------|-------|
| Project | meseeks |
| Date | 2026-05-05T15:32:47.127Z |
| Files tracked | 273 |
| Files analyzed | 273 |
| Total findings | 96 |

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 50 |
| MEDIUM | 26 |
| HIGH_BUG | 5 |
| BUG | 10 |

## CRITICAL (5)

### User-defined hard skills execute unrestricted server-side fetches

- **File:** `convex/reactor.private.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 126
- **Slug:** ssrf
- **Confidence:** high

`executeAction` builds a tool from the action's skill and executes it server-side. Tracing that call shows hard skills go through `createHTTPTool`, which constructs `new URL(config.url)` and calls `fetch(url.toString())`. Public skill creation and update accept hard-skill URLs with only `z.string().url()` validation, with no protocol allowlist, DNS/IP checks, private-network blocking, redirect validation, or egress proxy. An authenticated user can create a hard skill pointing at loopback, link-local, private network hosts, or cloud metadata-style endpoints, trigger it through the reactor, and read the response because HTTP response bodies and headers are persisted to action details for the action owner.

**Recommendation:** Treat hard-skill URLs as untrusted egress. Restrict protocols to `https:` unless there is a documented exception, block loopback/link-local/private/reserved IP ranges after DNS resolution, revalidate every redirect target or disable redirects, and consider routing hard-skill requests through an egress proxy with an allowlist. Keep response body persistence, but only after the outbound target has passed SSRF checks.

---

### User-created hard skills can make unrestricted server-side HTTP requests

- **File:** `src/components/skills/HardSkillConfig.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 219, 221, 246, 253, 310, 312
- **Slug:** ssrf
- **Confidence:** high

The hard skill form accepts an arbitrary endpoint URL from the user at lines 219-221, plus arbitrary headers at lines 246-255 and request body data at lines 310-312. That value flows through HardSkillForm into the skill create/update mutation, where the backend schema only checks that config.url is syntactically a URL. During execution, skills/createHttpTool.ts constructs new URL(config.url) and calls fetch(url.toString(), { method: config.method, headers, body }) without an origin allowlist, private-network denylist, DNS/IP validation, or redirect validation. Any authenticated user who can create and run a hard skill can force the server to request internal or link-local services such as cloud metadata endpoints, localhost admin ports, or private network resources. The response text is then read and persisted/returned to the action flow, so this is exploitable SSRF rather than just an outbound request feature.

**Recommendation:** Enforce SSRF protection in backend validation and execution, not only in the UI. Either allowlist approved public HTTPS origins for user-created hard skills, or block loopback, link-local, RFC1918, multicast, and other reserved address ranges after DNS resolution. Re-validate every redirect target, restrict dangerous user-supplied headers and methods for untrusted skills, and consider routing hard-skill egress through an isolated proxy with explicit destination policy.

---

### Hard-skill URLs become unrestricted server-side fetches

- **File:** `src/lib/skill-form-utils.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 149, 150, 152, 153
- **Slug:** ssrf
- **Confidence:** high

buildHardSkillFromForm copies the hard-skill URL, method, headers, parameter mappings, and optional body template from form data into the backend skill config without any allowlist or private-network validation. The backend create/update mutations accept that config through newSkillSchema, whose httpConfigSchema only requires z.string().url(). When the hard skill runs, createHTTPTool constructs new URL(config.url), applies attacker-controlled search/header/path/body mappings, and calls fetch(url.toString()) from the Convex action runtime. The response body is returned to the action and persisted in action details, so an authenticated attacker can create a hard skill targeting internal or metadata endpoints such as loopback, RFC1918, or link-local addresses if reachable from the server runtime, then exfiltrate the response through normal action output/debug details. UI validation is not a mitigation because the Convex mutation can be called directly and the fetch site also lacks a final egress check.

**Recommendation:** Enforce SSRF protection server-side in the shared schema/helper used by both skill creation and skill execution, and re-check immediately before fetch. Require https unless there is a deliberate exception, block localhost, loopback, link-local, private, multicast, and cloud metadata IP ranges after DNS resolution, handle DNS rebinding by resolving and connecting to the validated address, disallow redirects to blocked hosts, set tight timeouts and response-size limits, and consider an explicit host allowlist or outbound proxy for hard skills. Do not rely on the React form for this boundary.

---

### Editable hard skills can be changed to make unrestricted server-side HTTP requests

- **File:** `src/routes/skills_.$id.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 64
- **Slug:** ssrf
- **Confidence:** high

The edit route renders HardSkillForm for hard skills at line 64. For an owned skill, useSkill() calls api.skills.findOne, which marks the skill editable when skill.owner equals the current user. Submitting the form reaches api.skills.update, which accepts newSkillSchema and ultimately stores the submitted hard-skill config. The schema only requires config.url to be z.string().url() (schemas/skillSchema.tsx:26-28), and the execution path later does new URL(config.url) followed by fetch(url.toString()) with no allowlist, private-IP block, localhost/link-local block, redirect validation, or DNS rebinding defense (skills/createHttpTool.ts:27-70). An authenticated attacker can therefore edit one of their own hard skills to target internal metadata services, loopback services, private network hosts, or other backend-only endpoints, then trigger execution through a task/action. The existing ownership checks protect other users' skills, but they do not mitigate SSRF because the attacker is allowed to own and execute the malicious skill.

**Recommendation:** Enforce SSRF protection on the backend before persisting and again before executing hard-skill URLs. Prefer a strict allowlist or dedicated egress proxy. At minimum, allow only http/https as intended, resolve hostnames server-side, reject loopback, localhost, link-local, RFC1918/private, multicast, unique-local IPv6, and metadata ranges, disable or validate redirects with the same checks, re-resolve at request time to reduce DNS rebinding risk, and add tests covering blocked internal targets. Do not rely on UI validation.

---

### New hard skills allow attacker-controlled URLs to be fetched by the backend

- **File:** `src/routes/skills_.new.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 49
- **Slug:** ssrf
- **Confidence:** high

The new-skill route renders HardSkillForm at line 49. That form builds a hard skill from user-controlled fields and submits it through useSkillFormSubmit -> useSkillMutations -> api.skills.create. The backend create mutation authenticates the user but accepts the submitted newSkillSchema and stores the hard-skill config for that user. The schema only validates config.url as a syntactically valid URL (schemas/skillSchema.tsx:26-28). When the skill runs, createHTTPTool constructs new URL(config.url) and calls fetch(url.toString()) with the submitted method, headers, body, and no egress restrictions (skills/createHttpTool.ts:27-70). This gives any authenticated user a server-side request primitive that can target internal services such as loopback, link-local metadata addresses, private networks, or backend-only endpoints if reachable from the runtime. Human authorization and ownership checks do not remove the issue; an attacker can authorize and execute their own skill.

**Recommendation:** Move hard-skill URL policy into backend validation and execution. Use an allowlist or isolated outbound proxy for user-defined HTTP skills. If arbitrary external URLs remain a product requirement, block internal address ranges and localhost after DNS resolution, enforce http/https only, validate every redirect target, cap response size and timeout, and add regression tests for localhost, 127.0.0.1, ::1, 169.254.169.254, RFC1918, and DNS names resolving to private IPs.

---

## HIGH (50)

### Whitelist bypass allows arbitrary global member access

- **File:** `compiler-poc/strictWhitelistPlugin.js`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 121, 129, 147
- **Slug:** other-sandbox-bypass
- **Confidence:** high

The plugin is meant to reject identifiers that are not declared or explicitly whitelisted, but it skips every identifier whose parent is a MemberExpression at line 147 and only validates member access when the object name exists in ALLOWED_IMPORTS at lines 121-130. That means non-whitelisted globals such as globalThis, window, document, or process are not checked when used as member-expression objects. Computed member access is also skipped by the MemberExpression guard, so even allowed objects can bypass method restrictions with bracket access. In a compiler intended to constrain user code, an attacker can use global member chains such as the global Function constructor path to escape the whitelist and emit arbitrary JavaScript. The target file does not itself execute the generated code, so this is not direct RCE in this file alone, but it breaks the security boundary the plugin claims to enforce and becomes code execution/XSS wherever compiled untrusted code is run.

**Recommendation:** Do not skip MemberExpression identifiers wholesale. Resolve the root object of every member chain and require it to be either a local Babel scope binding or an explicitly allowed global. Reject computed properties unless the literal key is also whitelisted. Validate CallExpression callees, constructor access, and nested member chains recursively, and add tests for globalThis/window/document/process access plus console['debug']-style bypasses. If this compiler handles untrusted code, also run output inside a real sandbox; AST whitelists alone are brittle.

---

### Public action scheduling can execute header-leaking skill introspection

- **File:** `convex/action.private.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 160, 165, 175, 193, 200, 201
- **Slug:** secrets-exposure
- **Confidence:** high

addActions accepts caller-provided skill keys and inserts them directly into actions without validating that the skill is safe for direct user execution, enabled for the task, or blocked from introspection. The public `action.act` entrypoint passes its user-controlled `skills` array into this helper after only checking task ownership, and user-authored actions are auto-authorized by the reactor. A logged-in user can therefore enqueue the built-in `getSkillDetails` action against their own task and ask it for any global `isPro` hard-skill key. That built-in calls internal `skills._findOne`, which returns the full skill document; unlike public skill listing/detail endpoints, it does not redact `config.headers`. The code in `convex/skills.ts` explicitly strips headers from public `isPro` hard skills because they may contain passwords, so this path bypasses an existing secret-redaction boundary and can expose provider API keys or other credentials stored in global hard-skill headers.

**Recommendation:** Do not allow raw public `act` requests to execute arbitrary skill keys. Validate direct user-submitted skill keys against an explicit allowlist or against enabled task/user skills, and block or special-case introspection/admin-like built-ins. Also fix `getSkillDetails`/internal skill projections to redact `config.headers` for `owner: 'isPro'` hard skills everywhere, not only in public listing routes.

---

### Action settlement can charge beyond the reserved balance after paid work already ran

- **File:** `convex/reactor.accounting.ts`
- **Lines:** 99, 100, 151, 163, 182, 183
- **Slug:** expensive-api-abuse
- **Confidence:** high

`reserveEnergy` only checks that the user's current balance covers the predicted `maxCost` before execution. After the external tool or LLM has already run, `settleAction` explicitly accepts `actualCost > reservedEnergy`, logs the overrun, records a negative settlement transaction, and patches `balanceUSD` by adding that negative delta. There is no second balance check, no hard cap, and no refusal path before the paid provider cost is incurred. The prediction is not a true upper bound: soft-skill config accepts user-controlled `maxTokens` and `maxRetries`, while the preflight estimator uses its own output-token estimate. An authenticated user can therefore fund only the underestimated reserve, run an action whose actual provider cost is higher, and leave the account negative after the app has already paid for the request.

**Recommendation:** Make the reserved amount a real upper bound before execution. Cap and validate soft-skill `maxTokens` and retry settings, compute worst-case cost from those caps, and pass those same caps to the provider. Do not allow settlement to push account balance below zero for user-triggered work; if overruns must exist, require an explicit credit/debt policy with per-user limits and abuse monitoring.

---

### User-defined hard skills can persist arbitrary server-side fetch URLs

- **File:** `convex/skills.private.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 176, 187, 189, 197, 210, 212
- **Slug:** ssrf
- **Confidence:** high

`createSkill` and `updateSkill` accept `newSkillSchema` hard skills and persist/patch the supplied config after only checking key uniqueness and whether the input schema parses. The hard skill URL is only validated as a URL by the schema, with no allowlist, scheme restriction beyond URL parsing, DNS/IP filtering, localhost/private-network block, or metadata endpoint block. The execution path later builds `new URL(config.url)` and calls `fetch(url.toString())` from server-side code with caller-configured method, headers, and body. An authenticated user can therefore create or update a hard skill pointing at internal services or cloud metadata/control-plane endpoints and receive the response through the action result/details path.

**Recommendation:** Validate hard skill URLs before insert/update and again before execution. At minimum require `https:`, block localhost, loopback, link-local, RFC1918/private ranges, IPv6 local ranges, and known metadata hosts, and resolve DNS defensively to prevent rebinding. For global/app-managed skills, prefer an explicit domain allowlist. Keep the execution fetch behind the same egress policy rather than trusting previously stored config.

---

### AI-facing skill detail lookup can leak global hard-skill headers

- **File:** `convex/skills.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 31, 32, 37, 95, 98, 157, 159
- **Slug:** secrets-exposure
- **Confidence:** high

The internal `_findOne` query is used by `skills/builtIn/getSkillDetails.ts` so the AI can inspect a skill by key/owner, and it returns `findSkill` directly. The public `findAllPublic` and `findOne` paths explicitly redact `skill.config.headers` for `owner: 'isPro'` hard skills because those headers may contain passwords, but `_findOne` does not apply that redaction. Since `findSkill` prioritizes global `isPro` skills, a user can ask the AI-facing `getSkillDetails` tool for a global hard skill and receive the full serialized skill, including secret headers/API keys.

**Recommendation:** Share a redaction helper across all AI-visible and public skill lookup paths. `_findOne` should return a sanitized skill shape for `getSkillDetails`, with global hard-skill headers removed and preferably with only non-secret config fields exposed. Keep full headers available only to the execution path that actually performs the HTTP request.

---

### Google sign-in ignores the configured email/domain allowlist

- **File:** `lib/authOptions.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 19, 25, 45, 46, 47, 48
- **Slug:** auth-bypass
- **Confidence:** high

The runtime auth config enables Google OAuth with only clientId and clientSecret and does not pass or enforce any allowlist in createAuthOptions. This is security-relevant because schemas/envSchema.ts defines ALLOWED_DOMAINS and ALLOWED_EMAILS, and convex/users.ts explicitly says auth plus allowlist logic is centralized in getCurrentUser, but convex/users.private.ts never checks those env values. Better Auth's OAuth flow creates a user when no existing OAuth user is found unless sign-up is disabled or a server hook rejects it; this config does neither. The app trigger then creates a Meseeks user row and seedUserIfNeeded provisions welcome credits and an initial task. Attack scenario: if the Google OAuth client is publicly usable, any Google account can complete OAuth, receive a Better Auth session and Convex JWT, become an app user, and access authenticated app functionality despite not being in ALLOWED_EMAILS or ALLOWED_DOMAINS.

**Recommendation:** Enforce the allowlist on the server-side auth boundary. Pass normalized ALLOWED_EMAILS and ALLOWED_DOMAINS from schemas/envSchema into the auth setup, reject disallowed emails in a Better Auth database/user creation hook or equivalent OAuth sign-in hook before a session is issued, and also guard getCurrentUser/addUser so existing or race-created disallowed auth users cannot become usable app users. Prefer exact lowercased email matches and lowercased domain matches after trimming whitespace. Do not rely on UI checks or trustedOrigins; trustedOrigins is an origin/CSRF control, not an account allowlist.

---

### Unauthenticated local code-server exposes the workbench, filesystem, and terminal surface

- **File:** `prototypes/mecode-mvp/backend/supervisor.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 149, 173, 193, 194, 365, 366
- **Slug:** missing-auth
- **Confidence:** high

BackendSupervisor starts code-server on a random 127.0.0.1 port with authentication explicitly disabled. The launch snapshot writes "auth": "none", the CLI args include "--auth=none", and the generated config file contains "auth: none". code-server protects its VS Code routes with ensureAuthenticated, but in AuthType.None that check returns true for every request; the project docs also confirm the MVP relies only on localhost binding plus a random port. Any local process, another local OS user that can reach the loopback port, or a browser/DNS-rebinding style attack that discovers the port can access a code-server instance that has user-file, extension, proxy, and integrated-terminal capability under the app user's environment. A random localhost port is not an authorization boundary.

**Recommendation:** Add a per-launch secret and require it on every code-server HTTP/WebSocket/session entrypoint. Prefer code-server password/hashed-password auth with a high-entropy generated value passed only through the trusted native shell, or put a small authenticated local proxy in front of code-server and keep code-server unreachable directly. Do not treat port randomness as auth; also validate Host/Origin against the expected localhost endpoint and consider a health/readiness nonce so another local listener cannot impersonate the backend.

---

### Unauthenticated task creation can write files and trigger index rebuilds

- **File:** `organizer/src/components/tasks/CreateTaskView.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 70, 71, 134, 135, 136, 137, 138, 139, 140, 141, 142
- **Slug:** missing-auth
- **Confidence:** medium

CreateTaskView sends user-controlled title, body, status, tags, taskSource, and filename to the createTask TanStack Start server function at lines 70-71 and 134-142. Tracing that import shows organizer/src/server/taskExplorer.ts exports createTask as a POST server function with only Zod validation and no authentication or authorization before calling createTaskInFilesystem. The filesystem helper writes a new task file under tasks/ or private/tasks/ and then runs the task index generator. If Organizer is reachable by anyone other than the trusted local user, an attacker can create public or private task files and repeatedly force index rebuilds. This is not mitigated by the UI controls because TanStack server functions are callable endpoints and the server-side handler has no auth guard.

**Recommendation:** Require an explicit server-side auth/local-access guard on every Organizer server function before filesystem reads or writes. For this mutation, authorize before calling createTaskInFilesystem, and consider binding Organizer to localhost-only or adding a startup secret if it is meant to remain a local tool.

---

### Task body MDX executes arbitrary JavaScript in the browser

- **File:** `organizer/src/components/tasks/TaskDetailView.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 649
- **Slug:** xss
- **Confidence:** high

TaskDetailView renders task.body through the Mdx component at line 649. Tracing that sink shows organizer/src/components/ui/mdx.tsx calls useMDX(text), and organizer/src/hooks/useMDX.tsx compiles attacker-controlled text with @mdx-js/mdx using format: "mdx" and outputFormat: "function-body", then passes the generated code to run(). There is no sanitization, no disabling of MDX expressions/JSX, and no sandbox. Because task bodies can come from created or edited task files, a malicious task body can include MDX expressions such as JavaScript evaluated during render, causing stored XSS when another user opens the task detail. The custom anchor/image renderers also accept href/src strings without URL scheme validation, leaving additional javascript: or tracking-link exposure even if expression execution is later disabled.

**Recommendation:** Do not run MDX as code for task bodies. Render task content as markdown-only, disable MDX expressions and JSX, sanitize HTML with a strict allowlist, and reject dangerous URL schemes for links and images. If executable MDX is intentionally needed, render it in a sandboxed iframe with a locked-down CSP and no access to the Organizer origin.

---

### Unauthenticated task mutations can move, rename, edit, and complete files

- **File:** `organizer/src/components/tasks/TaskDetailView.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 81, 82, 83, 84, 85, 112, 113, 123, 124, 125, 136, 137, 138, 150, 151, 152, 163, 164, 165
- **Slug:** missing-auth
- **Confidence:** medium

TaskDetailView wires markTaskDone, moveTask, renameTask, updateTaskTags, and updateTaskTitle server functions at lines 81-85, then invokes them from mutation handlers using only the client-selected task key and user-entered values. Tracing those imports shows organizer/src/server/taskExplorer.ts exposes each operation as a POST server function with Zod validation but no authentication or authorization before looking up the task and calling filesystem mutation helpers. Those helpers rename files, rewrite frontmatter, and run the task index generator. If Organizer is exposed beyond the trusted local user, an attacker can mutate public/private task files, corrupt task organization, and repeatedly trigger rebuild work. The client-side selectedTaskKey and disabled button states do not protect the server endpoints.

**Recommendation:** Add server-side authentication and an explicit local/operator authorization check to every task mutation server function before task lookup or filesystem mutation. Keep validation, but treat it as shape validation only; it is not an access control boundary.

---

### Unauthenticated task explorer reads expose private task metadata and content

- **File:** `organizer/src/components/tasks/TaskExplorerPage.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 49, 50, 51, 56, 57, 58, 59, 60, 61, 62, 63
- **Slug:** missing-auth
- **Confidence:** medium

TaskExplorerPage calls getExplorerSnapshot and getTaskDetail server functions at lines 49-63, passing query filters and the selected task key from route search state. Tracing those imports shows organizer/src/server/taskExplorer.ts exposes both as GET server functions with only Zod validation and no authentication. getExplorerSnapshot returns task lists, facets, status options, health data, and metadata from generated indexes; getTaskDetail returns the selected task body, raw frontmatter, warnings, paths, and relations. The read model includes both public and private sources by default, so a reachable Organizer instance leaks private task data without any backend auth check.

**Recommendation:** Require a server-side auth/local-access guard in getExplorerSnapshot and getTaskDetail before reading generated indexes. If Organizer is intentionally local-only, enforce that at the server boundary as well, not just by convention or UI routing.

---

### Task MDX is compiled and executed as JavaScript

- **File:** `organizer/src/components/ui/mdx.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 372, 399
- **Slug:** xss
- **Confidence:** high

The Mdx component accepts arbitrary text and passes it to useMDX at line 372, then invokes the returned compiled component at line 399. The imported hook organizer/src/hooks/useMDX.tsx compiles the text with @mdx-js/mdx using outputFormat: "function-body" and runs it with run(), so MDX expressions and module-level code execute as JavaScript in the browser origin. This is not just markdown rendering. The rendered input is task.body from TaskDetailView, and the task creation path accepts arbitrary body text up to 50000 characters before writing it into the task file. An attacker who can get malicious content into a task body through the task creation server function, generated task content, imported task files, or a malicious repository/task contribution can execute script when the task detail view is opened. That script can read same-origin organizer data and call same-origin server functions to mutate local task files with the victim's browser context. The error boundary only catches render failures; it does not sandbox or sanitize executed MDX.

**Recommendation:** Do not execute MDX for task bodies. Render task content as data, not code: use a markdown-to-React pipeline with JSX/expressions disabled and a strict HTML/URL sanitizer, or parse markdown to a whitelisted AST and map only safe elements/components. If full MDX must remain, restrict it to trusted built-in content only, render untrusted content in a sandboxed iframe with a restrictive CSP, sanitize links and images by protocol, and avoid Mermaid loose mode for user-controlled diagrams.

---

### Private task metadata and full task bodies are exposed through unauthenticated read models

- **File:** `organizer/src/server/taskExplorerReadModel.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 16, 301, 328, 336, 360, 390, 428, 442, 449, 450
- **Slug:** missing-auth
- **Confidence:** high

The read model defaults to both `public` and `private` task sources, projects task titles/tags/excerpts in the explorer list, and returns full task detail including `absolutePath`, full `body`, and `rawFrontmatter`. These functions are called by `organizer/src/server/taskExplorer.ts` GET server functions (`getExplorerSnapshot` and `getTaskDetail`) that only validate input and do not enforce auth. An unauthenticated caller who can reach Organizer can enumerate private task titles, tags, statuses, excerpts, filesystem paths, warnings, and full task bodies by calling the server functions or by using `taskKey` values from the explorer response.

**Recommendation:** Require authentication before returning snapshots or details, filter `private` source data by authorization, and remove `absolutePath` and `rawFrontmatter` from client responses unless the caller is explicitly trusted to see them.

---

### Task bodies flow into client-side MDX execution

- **File:** `organizer/src/server/taskExplorerReadModel.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 390, 449
- **Slug:** xss
- **Confidence:** high

`buildTaskDetail` returns the raw task body from the generated content index. The UI passes that body to `Mdx`, and `useMDX` compiles and runs it with `@mdx-js/mdx` using `outputFormat: "function-body"`. Because the unauthenticated `createTask` server function can persist attacker-controlled task bodies and rebuild the index, an attacker can plant a malicious MDX task and lure a victim to a URL selecting that `taskKey`. MDX expressions execute as JavaScript during render, so this is stored XSS in the Organizer origin, not merely unsafe markdown display.

**Recommendation:** Do not compile untrusted task content as MDX. Render task bodies as sanitized Markdown with MDX expressions/imports disabled, or only allow MDX for trusted local files after authentication. Add a restrictive CSP as defense in depth, but do not rely on CSP as the primary fix.

---

### Unauthenticated server functions can mutate task files and force index rebuilds

- **File:** `organizer/src/server/taskMutationRepository.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 65, 553, 593, 634, 685, 724, 767
- **Slug:** missing-auth
- **Confidence:** high

This file contains the sensitive filesystem write surface: completing, moving, renaming, creating, and editing task files, then calling runTaskIndexBuild(), which executes a fixed `bun run .config/generate-task-index.ts` command. The command is not attacker-controlled, so the scanner's RCE hit is a false positive. The real issue is that these helpers are imported directly by `organizer/src/server/taskExplorer.ts` server functions (`createTask`, `markTaskDone`, `moveTask`, `renameTask`, `updateTaskTags`, `updateTaskTitle`) that only perform Zod input validation and do not check authentication, authorization, origin, CSRF token, or local-only access. If Organizer is reachable by anyone other than the intended local user, an attacker can create arbitrary task bodies under either `public` or `private`, move or rename known tasks, edit titles/tags, mark tasks completed, and repeatedly spawn expensive task index rebuilds.

**Recommendation:** Add an auth/local-only guard before any server function calls these helpers, enforce authorization for `taskSource` and `taskKey`, add CSRF/origin protection for browser-callable POSTs, and rate-limit or serialize rebuild-triggering mutations. If Organizer is intended only as a local tool, bind it to localhost and fail closed when exposed on a non-loopback interface.

---

### Daytona API key is checked into the skill catalog and deployed as a request header

- **File:** `private/skills/definitions/isPro/analyze.ts`
- **Lines:** 2, 31, 38
- **Slug:** secrets-exposure
- **Confidence:** high

The analyze hard skill imports API_KEYS and sends API_KEYS.daytona as the X-API-Key header to the Daytona code-execution endpoint. The imported value is not resolved from a backend secret at runtime: private/skills/config.ts contains real-looking dev and prod Daytona keys, and private/skills/deploy.ts loads these definitions and serializes the full skill configs into Convex. Anyone with source access, deploy payload/log access, DB access to skill docs, or a code path that exposes hard-skill headers can recover the credential and call the code-execution service outside Meseeks. The scanner's insecure-crypto match is a false positive, but this is a real hardcoded credential issue.

**Recommendation:** Rotate the Daytona key, remove hardcoded API keys from private/skills/config.ts, and inject the header from a backend-only environment variable or secret manager inside createHTTPTool. Do not persist concrete secret header values in skill documents; store a secret reference or provider identifier instead.

---

### AI-generated React compositions run as first-party unsandboxed JavaScript

- **File:** `private/skills/definitions/isPro/compose.ts`
- **Lines:** 20, 28, 32, 49, 54, 136
- **Slug:** xss
- **Confidence:** high

The compose skill gives the model the render tool and instructs it to pass complete React code to render(). That code is later injected into a srcDoc iframe by src/lib/iframe-generator.ts, but both src/components/actions/RenderAction.tsx and src/components/CompositionFrame.tsx render the iframe without a sandbox attribute. A srcDoc iframe without sandboxing runs with the app's origin, so prompt-injected or model-generated code can access parent DOM, first-party storage/cookies available to JavaScript, and authenticated same-origin APIs. The prompt claims a secure iframe and no network access, but those are instructions to the model, not browser-enforced controls. Publicly shared compositions use the same CompositionFrame path, so a malicious shared render can become stored XSS for viewers.

**Recommendation:** Render generated compositions in a real isolation boundary: add an iframe sandbox without allow-same-origin, serve renders from a separate origin, and add a restrictive CSP that blocks network/form/top-navigation access unless explicitly needed. Use postMessage with strict origin/source validation for the minimal parent communication needed, and apply the same isolation to shared composition routes.

---

### Skill-learning workflow can expose hard-skill secrets through getSkillDetails

- **File:** `private/skills/definitions/isPro/learnSkill.ts`
- **Lines:** 20, 106, 120, 121, 122, 123
- **Slug:** secrets-exposure
- **Confidence:** high

learnSkill makes getSkillDetails available and explicitly requires the model to call getSkillDetails before updating an existing skill. It also instructs the model to put API keys, tokens, and passwords into fixed hard-skill headers or body parameters instead of input schema. The getSkillDetails implementation calls internal.skills._findOne and JSON.stringify()s the full skill object; internal _findOne returns global and personal hard-skill configs without the public-query header redaction used by convex/skills.ts. As a result, updating or inspecting a hard skill can place config.headers and other auth-bearing config into action history, model context, external LLM provider requests, debug views, or subsequent model output. For the built-in analyze skill this can expose the Daytona X-API-Key; for user-created skills it can expose user API credentials.

**Recommendation:** Redact secret-bearing fields before returning skill details to any model-facing or user-facing path. At minimum omit config.headers and known auth-bearing request-template fields from getSkillDetails; preferably store secrets as backend-only references rather than raw skill document values. Update learnSkill's instructions to ask for secret references or user-managed credentials instead of asking the model to handle raw API keys.

---

### Built-in Valyu skill sources its API key from hardcoded credentials

- **File:** `private/skills/definitions/valyu/valyu_search.ts`
- **Lines:** 2, 35
- **Slug:** secrets-exposure
- **Confidence:** high

The skill imports API_KEYS from skills/config and places API_KEYS.valyu directly into the x-api-key header for the provider request. The imported config file contains literal dev and prod provider credentials in source, and private/skills/deploy.ts serializes these skill definitions into Convex through skills:_replaceProSkills. Header stripping in public skill queries only protects one display path; it does not remove the credential from source, deployment payloads, or the raw db-backed hard-skill config used at execution time. Anyone with access to the private repo, deployment artifacts/temp payload, or raw skill documents can recover the Valyu credential.

**Recommendation:** Rotate the exposed Valyu keys. Remove literal credentials from skills/config, store only a secret reference in the skill definition, and resolve the real key from server-side environment/secret storage at execution time. Avoid persisting provider request headers in db-backed skill documents or deploy payloads.

---

### Vercel bearer token is hardcoded and deployed as a skill header

- **File:** `private/skills/definitions/vercel/vercel_checkDomainAvailability.ts`
- **Lines:** 2, 25
- **Slug:** secrets-exposure
- **Confidence:** high

This skill builds its Authorization header from `API_KEYS.vercel` and sends it as a bearer token. Tracing the import shows `private/skills/config.ts` contains hardcoded Vercel tokens for both dev and prod, and `private/skills/deploy.ts` calls `setEnvironment()`, imports these definitions, serializes the full skill config, and writes it into the Convex `isPro` skill catalog. Public skill queries strip headers before returning them, so this is not exposed through `skills.findAllPublic`, but the credential is still committed in source and persisted into backend data. Anyone with access to the private repo, build logs/artifacts, or a Convex data leak gets a live Vercel API token that may have broader account privileges than checking domain availability.

**Recommendation:** Rotate the Vercel tokens immediately. Remove provider credentials from source and deployed skill documents; load them from a server-side secret source such as Convex env at execution time, or store only a secret reference in the skill config and resolve it inside `createHTTPTool`. Add deployment validation that rejects literal tokens or placeholder secrets in skill definitions.

---

### Vercel bearer token is hardcoded and deployed as a skill header

- **File:** `private/skills/definitions/vercel/vercel_checkDomainPrice.ts`
- **Lines:** 2, 26
- **Slug:** secrets-exposure
- **Confidence:** high

This skill builds its Authorization header from `API_KEYS.vercel` and sends it as a bearer token. Tracing the import shows `private/skills/config.ts` contains hardcoded Vercel tokens for both dev and prod, and `private/skills/deploy.ts` calls `setEnvironment()`, imports these definitions, serializes the full skill config, and writes it into the Convex `isPro` skill catalog. Public skill queries strip headers before returning them, so this is not exposed through `skills.findAllPublic`, but the credential is still committed in source and persisted into backend data. Anyone with access to the private repo, build logs/artifacts, or a Convex data leak gets a live Vercel API token that may have broader account privileges than checking domain prices.

**Recommendation:** Rotate the Vercel tokens immediately. Remove provider credentials from source and deployed skill documents; load them from a server-side secret source such as Convex env at execution time, or store only a secret reference in the skill config and resolve it inside `createHTTPTool`. Add deployment validation that rejects literal tokens or placeholder secrets in skill definitions.

---

### Built-in YouTube description skill sources Gemini API key from hardcoded credentials

- **File:** `private/skills/definitions/youtube/describeYouTube.ts`
- **Lines:** 2, 43
- **Slug:** secrets-exposure
- **Confidence:** high

The skill imports API_KEYS from skills/config and places API_KEYS.gemini directly into the x-goog-api-key header for Gemini requests. The imported config file contains literal dev and prod Gemini API keys in source, and the private skill deployment flow serializes this hard-skill config into Convex. Public queries strip isPro hard-skill headers before returning them to normal clients, but that does not protect the source file, deploy payloads, or raw stored skill configuration.

**Recommendation:** Rotate the exposed Gemini keys. Move the credential into server-side environment/secret storage, store only a secret reference in the skill definition, and inject the header at execution time rather than persisting it in the skill document.

---

### Built-in YouTube transcription skill sources Gemini API key from hardcoded credentials

- **File:** `private/skills/definitions/youtube/transcribeYouTube.ts`
- **Lines:** 2, 43
- **Slug:** secrets-exposure
- **Confidence:** high

The skill imports API_KEYS from skills/config and places API_KEYS.gemini directly into the x-goog-api-key header for Gemini requests. The imported config file contains literal dev and prod Gemini API keys in source, and the private skill deployment flow serializes this hard-skill config into Convex. Public queries strip isPro hard-skill headers before returning them to normal clients, but that does not protect the source file, deploy payloads, or raw stored skill configuration.

**Recommendation:** Rotate the exposed Gemini keys. Move the credential into server-side environment/secret storage, store only a secret reference in the skill definition, and inject the header at execution time rather than persisting it in the skill document.

---

### Render action results execute as same-origin iframe JavaScript

- **File:** `schemas/actionSchema.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 74, 75
- **Slug:** xss
- **Confidence:** high

The action schema stores resolved action output in result.text without distinguishing plain text from executable render output. For the built-in render skill, that field contains Babel-transpiled user/AI-generated React code: skills/builtIn/render.ts passes args.code to internal.babel._transpileCode and returns the transpiled code as text. The UI then feeds action.result?.text into CompositionFrame in src/routes/action_.$id.tsx and into useIframeRenderer in src/components/actions/RenderAction.tsx. Both render paths produce an iframe srcDoc, and the iframe elements do not set a sandbox attribute. src/lib/iframe-generator.ts injects the stored code directly into a script block after only escaping </script. A malicious render action can therefore run arbitrary JavaScript in an about:srcdoc document that inherits the Meseeks origin, allowing access to parent/window state and same-origin credentials such as the readable Convex JWT cookie used by ConvexAuthProvider. Ownership checks on api.action.findOne only ensure the victim owns the action; they do not mitigate malicious code generated through prompt injection, external content, or an attacker-controlled render workflow that the victim executes.

**Recommendation:** Treat render action output as untrusted executable code. Add a sandbox to every render iframe, preferably sandbox="allow-scripts" without allow-same-origin, and keep communication limited to validated postMessage events. Consider serving renders from a separate origin with a restrictive CSP. Also separate render-code results from ordinary text results in the schema so executable output cannot accidentally flow into unsandboxed or same-origin renderers.

---

### Public shared components execute untrusted code on the app origin

- **File:** `schemas/componentSchema.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 11, 13
- **Slug:** xss
- **Confidence:** high

componentSchema allows arbitrary component body content and an isPublic flag. The traced sharing path makes this remotely exploitable: convex/components.ts shareRenderAction copies a succeeded render action's result.text into a new public component body; findPublicById returns that body without authentication when component.isPublic is true; src/routes/share_.$id.tsx passes the body into CompositionFrame; CompositionFrame renders it as iframe srcDoc without a sandbox attribute; and src/lib/iframe-generator.ts injects the body into a script block. An attacker can create a malicious render action in their own account, share it publicly, and send the /share/<componentId> link to a victim. When the victim opens it on the Meseeks origin, the srcdoc iframe runs attacker-controlled JavaScript with the inherited app origin instead of an opaque sandboxed origin. That JavaScript can read same-origin browser state, interact with window.parent, and use the victim's authenticated browser context, including the intentionally readable Convex JWT cookie.

**Recommendation:** Do not render public component bodies in a same-origin unsandboxed iframe. Add sandbox="allow-scripts" without allow-same-origin to CompositionFrame and RenderAction iframe usages, validate postMessage payloads, and consider serving public compositions from a dedicated isolated origin with a restrictive CSP. Until that exists, do not expose user-controlled render output through isPublic components.

---

### Hard skills can perform server-side fetches to arbitrary URLs

- **File:** `schemas/skillSchema.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 27, 35, 265, 273
- **Slug:** ssrf
- **Confidence:** high

The hard-skill schemas accept user-controlled URLs using only `z.string().url()` in `httpConfigSchema` and an even looser `z.string()` in `simplifiedHttpConfigSchema`, with arbitrary request headers. Tracing this into `skills/createHttpTool.ts` shows the configured URL is passed to `new URL(config.url)` and then directly to server-side `fetch(url.toString(), { method, headers, body })`; the response body and headers are persisted and returned through action details/results. A user-created or AI-created hard skill can therefore make the Convex runtime request attacker-chosen hosts, including private IP ranges, localhost, cloud metadata endpoints, or internal service URLs if reachable from the runtime. That is a classic SSRF sink; impact becomes critical if the deployment network exposes metadata or internal admin services.

**Recommendation:** Validate outbound HTTP targets before storing and before fetching. Restrict protocols to `https:` and optionally `http:` only where needed, block localhost, loopback, link-local, private RFC1918, IPv6 local, metadata ranges, and DNS rebinding after resolution. Prefer an allowlist for global/provided skills, and enforce the same URL policy in `createHttpTool` so existing stored skills cannot bypass new schema checks.

---

### Task instructions and summaries are stored as executable MDX

- **File:** `schemas/taskSchema.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 29, 32, 33
- **Slug:** xss
- **Confidence:** high

The task schema accepts arbitrary strings for `instructions` and `summary` and documents them as MDX-capable content. Tracing the render path shows `TaskDetail` renders `task.instructions` through `<MDX text={value} />`, `CollapsibleSummary` renders `task.summary` the same way, and `src/hooks/useMDX.tsx` compiles the string with `@mdx-js/mdx` using `format: 'mdx'` and runs the generated function body with `run()`. There is no sanitization, `rehype-sanitize`, expression stripping, or markdown-only mode for these task fields. Because task instructions and summaries can be updated by the built-in `updateInstructions` skill with `preApprovedCost: 0n`, model output influenced by prompt injection or attacker-controlled external content can become stored MDX that executes JavaScript in the user's browser when the task is viewed.

**Recommendation:** Do not run untrusted task content as MDX. Render task instructions and summaries as safe markdown (`format: 'md'`) or a sanitized markdown AST, and disable MDX expressions, ESM, and JSX for user/model-controlled content. If component-bearing MDX is required, split it into a separate trusted content type and only allow it from app-managed sources after review.

---

### AI-created hard skills can persist arbitrary server-side HTTP targets

- **File:** `skills/builtIn/createSkill.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 44, 119, 120
- **Slug:** ssrf
- **Confidence:** high

For hard skills, `createConfig` copies `skill.config.url`, method, headers, parameter mappings, and body into `httpConfigSchema` with no host, protocol, private IP, loopback, link-local, or metadata-service restrictions. The resulting hard skill is later executed by `createHTTPTool`, which builds `new URL(config.url)` and performs a server-side `fetch`, returning and storing the response body. Because `skill.config.url` is model/user-controlled input, this gives an authenticated user, or a prompt-influenced companion after approval, a server-side request primitive that can target internal services if the runtime can reach them. The `isSafe` flag also influences future preapproval, but it is supplied by the same untrusted skill payload.

**Recommendation:** Validate the final URL at execution time and at persistence time: require `https`, block loopback, private, link-local, multicast, localhost, and cloud metadata ranges after DNS resolution, and consider an explicit allowlist for hard-skill hosts. Do not let model-provided `isSafe` alone determine automatic approval for server-side HTTP skills.

---

### Global hard-skill secret headers leak through getSkillDetails

- **File:** `skills/builtIn/getSkillDetails.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 10, 24, 37, 38
- **Slug:** secrets-exposure
- **Confidence:** high

getSkillDetails accepts a user-controlled skillKey and calls internal.skills._findOne with the current task owner, then serializes the entire returned skill document into the action result with JSON.stringify. The internal findSkill helper resolves global owner 'isPro' skills before user-owned skills, and hard-skill configs include config.headers. The public skill queries explicitly strip config.headers from isPro hard skills because they may contain passwords, but this built-in does not apply that sanitizer. A normal authenticated user can create or use their own task, enqueue getSkillDetails for a global hard skill, and receive an action result containing provider Authorization/x-api-key headers from the global skill catalog. The reactor auto-authorizes owner-authored actions, so this does not require a companion action or admin privileges.

**Recommendation:** Return a sanitized projection instead of serializing the full skill document. At minimum, before returning details, redact config.headers for every hard skill owned by 'isPro'. Prefer a shared sanitizer used by findAllPublic, findOne, and getSkillDetails so global hard-skill headers can never leave the server. If the AI only needs to inspect skill behavior, return key, description, inputSchema, cost labels, preApprovedCost labels, knownReactions, method, URL shape, body template, and header names or '<redacted>' values, not secret header values.

---

### Render skill output executes attacker-controlled code in an unsandboxed same-origin iframe

- **File:** `skills/builtIn/render.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 9, 27, 31
- **Slug:** xss
- **Confidence:** high

The render skill accepts arbitrary React component source via `code` and sends it to `internal.babel._transpileCode`, then returns the transpiled JavaScript as action result text. That result is later passed to `useIframeRenderer()` and injected into a `<script>` block by `src/lib/iframe-generator.ts`; the only escaping there is `</script` replacement, which prevents one script-breakout pattern but does not restrict what the JavaScript can do. The rendered iframe in `src/components/actions/RenderAction.tsx` and `src/components/CompositionFrame.tsx` uses `srcDoc` without a `sandbox` attribute. Unsandboxed `srcDoc` iframes are same-origin with the parent document, so the rendered component code can access `window.parent`, same-origin storage, and authenticated app context. This is especially exploitable because `convex/components.ts` allows render actions to be shared publicly and `src/routes/share_.$id.tsx` renders shared component bodies with the same unsandboxed `CompositionFrame`, so a malicious shared render can execute script on the Meseeks origin when a victim opens the share URL.

**Recommendation:** Run generated render code in a real isolation boundary. At minimum, add an iframe sandbox that allows scripts but not same-origin access, for example `sandbox="allow-scripts"`, and keep parent communication limited to validated `postMessage` messages. A stronger fix is to serve renders from a separate origin with no app cookies/session and a tight CSP. Do not treat `</script` escaping as a sandbox; it only prevents early script-tag termination, not malicious JavaScript execution.

---

### Unescaped skill key is interpolated into executable MDX

- **File:** `skills/builtIn/requestFunds.ts`
- **Lines:** 11, 19
- **Slug:** xss
- **Confidence:** high

`requestFunds` builds an MDX string by directly interpolating `args.previousActionKey` into `text`. That argument is populated from `action.skillKey` in `convex/reactor.ts` when account funds are insufficient. Skill keys are not constrained to a safe identifier format: `schemas/skillSchema.tsx` allows `key: z.string().min(3)`, `schemas/actionSchema.tsx` uses plain `z.string()` for `skillKey`, and the public `api.action.act` mutation also accepts `skillKey: z.string()`. The resulting request-funds action is rendered by `src/components/actions/RequestBudgetAction.tsx` with `isMDX={true}` and `shouldRenderComponents={true}`; `src/hooks/useMDX.tsx` compiles that string as MDX and runs the generated JavaScript. A malicious skill key containing MDX/JS expression syntax can therefore become executable script when the funds request is displayed. This can be reached by a malicious or compromised skill definition, or by any flow that causes the companion/user to create or run a skill with an attacker-controlled key and then hit the insufficient-funds recovery path.

**Recommendation:** Do not concatenate untrusted values into MDX. Render the previous action key as plain React text from structured data, or escape MDX metacharacters before interpolation. Also constrain skill keys at the schema boundary with a safe identifier regex such as `^[A-Za-z][A-Za-z0-9_-]{2,63}$`, and apply the same validation to action `skillKey` inputs and known reactions. For system-generated budget messages, prefer a structured result like `{ kind: 'requestFunds', amount, previousActionKey }` and render the component directly instead of compiling arbitrary MDX.

---

### Scheduled instructions are rendered as executable MDX through the generic action renderer

- **File:** `skills/builtIn/scheduledIteration.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 28, 29, 35
- **Slug:** xss
- **Confidence:** high

scheduledIteration appends args.instructions directly into the result text on lines 28-30 and returns that text on line 35. The instructions originate from schedule creation and are not escaped or sanitized. There is no dedicated scheduledIteration entry in src/components/actions/index.tsx, so these actions fall back to GenericAction. GenericAction renders short result text with <MDX text={result} />; MDX defaults shouldRenderComponents to true, and useMDX compiles with format 'mdx' and runs the generated function body in the browser. A malicious scheduled instruction such as a short MDX expression/JSX payload can therefore execute client-side when the scheduledIteration action result is rendered. This is not mitigated by Zod because the field is only typed as string.

**Recommendation:** Do not feed scheduledIteration result text to the full MDX renderer. Add a dedicated ScheduledIterationAction component that renders this message as plain text, or make GenericAction render untrusted action results with shouldRenderComponents=false. Also escape or structurally separate user-provided instructions before putting them in any display string.

---

### Stored MDX execution through task instructions and summary

- **File:** `skills/builtIn/updateInstructions.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 13, 16, 17, 20, 43, 46, 47
- **Slug:** xss
- **Confidence:** high

The skill accepts attacker-influencable `instructions` and `summary` strings explicitly described as MDX, then persists them through `internal.tasks._updateInstructions` without sanitization. These fields are later rendered by `TaskDetail` and `CollapsibleSummary` using the shared `MDX` component, whose default is `shouldRenderComponents = true`; `useMDX` compiles the string as MDX and runs the generated function body with `@mdx-js/mdx`. That turns task content into executable browser code, not inert markup. Because `updateInstructions` has `preApprovedCost: 0n`, a companion-authored tool call can update these fields without a human approval step; prompt-injected or otherwise untrusted content copied into a task can become stored XSS in the task owner's authenticated browser session. Task ownership is not a mitigation here: it scopes the stored payload to the victim's task but does not prevent execution when the victim views it.

**Recommendation:** Treat task instructions and summaries as untrusted content. Render them as sanitized Markdown, not executable MDX; at minimum pass `shouldRenderComponents={false}` for task/user/AI-controlled text and add a sanitizer such as `rehype-sanitize`. If MDX components are required, use a strict allowlist that disables arbitrary expressions/imports and never calls `run` on untrusted strings. Add regression tests covering payloads with MDX expressions, JSX event handlers, raw HTML, and script-breaking content.

---

### Hard skill updates can persist arbitrary server-side fetch URLs

- **File:** `skills/builtIn/updateSkill.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 30, 39
- **Slug:** ssrf
- **Confidence:** high

`updateSkill` accepts a user/AI-supplied skill object and persists `config: createConfig(skill)` through `internal.skills._update`. For hard skills, the imported `createConfig` path carries `skill.config.url` into the stored hard-skill config with only syntactic URL validation. The execution sink is `skills/createHttpTool.ts`, which later does `new URL(config.url)` and `fetch(url.toString())` server-side with configured headers. An authenticated user can update one of their hard skills to target loopback, link-local, cloud metadata, or other internal addresses if reachable from the server runtime, then execute that skill through the normal action path. Ownership checks only prove the attacker owns the skill; they do not make arbitrary server-side egress safe.

**Recommendation:** Validate hard-skill URLs at the backend boundary and again immediately before fetch. Restrict protocols to `https:` and possibly `http:` only when explicitly needed; block localhost, loopback, private RFC1918 ranges, link-local ranges, multicast, IPv6 local ranges, and cloud metadata hosts; resolve DNS server-side and protect against DNS rebinding and redirects to blocked ranges. Prefer an explicit outbound allowlist or an egress proxy for hard skills.

---

### Built-in getSkillDetails can leak global hard-skill secrets

- **File:** `skills/createBuiltInTool.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 21, 23, 26, 27, 28
- **Slug:** secrets-exposure
- **Confidence:** high

createBuiltInTool executes the selected built-in skill and returns its text directly as the action result. The getSkillDetails built-in calls internal.skills._findOne and JSON.stringify's the full returned skill document. convex/skills.private.ts resolves global isPro skills before user skills, and global hard skills carry secret config.headers for provider credentials. Because getSkillDetails has preApprovedCost 0n and public action.act accepts arbitrary skill keys on an owned task, any authenticated user can enqueue getSkillDetails for a global hard skill and receive the raw config, including app-managed API keys and authorization headers, in the task conversation/action result.

**Recommendation:** Do not return raw skill documents from getSkillDetails or internal skill lookup paths. Create a sanitized skill DTO that omits or redacts config.headers, auth-bearing body/template fields, and any other provider secrets for isPro hard skills. Reuse the sanitizer in findOne, findAllPublic, getSkillDetails, and any model-visible skill inspection path, then add regression tests for global hard skills with secret headers.

---

### Render built-in leads to unsandboxed same-origin code execution

- **File:** `skills/createBuiltInTool.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 21, 23, 26, 27
- **Slug:** xss
- **Confidence:** high

createBuiltInTool returns text from built-in executions directly. For the render built-in, that text is transpiled AI/user-controlled React code. The frontend later injects it into iframe srcDoc in RenderAction and CompositionFrame without a sandbox attribute. An unsandboxed srcDoc iframe inherits the parent origin, so generated code can reach window.parent, read same-origin browser storage available to scripts, drive the app DOM, and call same-origin APIs with the user's session. A prompt-injected scraped page or malicious task instruction can therefore become stored same-origin XSS when the user views the render action.

**Recommendation:** Render generated code in a sandboxed, unique-origin iframe. Use sandbox='allow-scripts' without allow-same-origin, add a restrictive CSP, avoid exposing parent access except through narrow postMessage handlers with origin/source validation, and consider serving renders from a separate untrusted rendering origin. Keep escaping </script, but do not treat that as the isolation boundary.

---

### Built-in schedule cancellation bypasses ownership checks

- **File:** `skills/createBuiltInTool.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 21, 23
- **Slug:** acl-check
- **Confidence:** high

createBuiltInTool delegates side-effecting built-ins with the current task/action context but no resource-level guard at the wrapper. The cancelSchedule built-in accepts a model/user supplied scheduleId and calls internal.schedules._cancel. The internal cancelSchedule helper fetches that schedule by id, cancels its scheduled job, and deletes it without checking schedule.owner or schedule.taskId against execution.task.owner/execution.task._id. The public schedules.cancel mutation does perform ensureTaskOwner, but the built-in path bypasses that protection. Any user who obtains another user's schedule id can cancel that schedule by running the built-in on their own task.

**Recommendation:** Enforce ownership in the internal cancellation helper, not only in the public mutation. Pass taskId and owner from the built-in execution context into internal.schedules._cancel, then require the loaded schedule to match both before cancelling or deleting. Return generic NotFound on mismatch.

---

### Unrestricted server-side fetch for user-controlled hard skill URLs

- **File:** `skills/createHttpTool.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 28, 32, 38, 42, 45, 48, 51, 66, 75, 89, 90, 143, 154, 161
- **Slug:** ssrf
- **Confidence:** high

createHTTPTool builds a URL from skill.config.url, lets runtime tool args alter query parameters, headers, path, and body, then calls fetch without protocol, hostname, IP-range, DNS, redirect, timeout, or response-size egress controls. Hard skills can be created by users and by the built-in createSkill flow with only z.string().url validation, so an authenticated attacker can create or trigger a hard skill pointed at localhost, link-local metadata, private network services, or attacker-controlled redirectors. The response body is read and returned/persisted, so successful SSRF data is directly exfiltrated through the action result or action details. fetch follows redirects by default, so even a future hostname allowlist would be bypassable unless each redirect hop is revalidated.

**Recommendation:** Add a central hard-skill egress guard before fetch: allow only http/https as explicitly intended, resolve and block localhost, loopback, link-local, private, multicast, and metadata IP ranges, reject DNS rebinding, set redirect: 'manual' and revalidate Location before following, enforce an allowlist for app-managed global skills, and cap request duration and response bytes. Treat stored response body and headers as sensitive debug data.

---

### Path parameters are inserted without URL encoding

- **File:** `skills/createHttpTool.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 44, 45, 66, 68
- **Slug:** other-upstream-api-confused-deputy
- **Confidence:** high

For path mappings, the code replaces :target in url.pathname with String(value) directly. Runtime args are controlled by the user or by the model, so values containing slashes, dot segments, or encoded path separators can change the upstream API path while preserving the configured host, method, and app-managed headers. This lets a caller turn a narrowly configured global hard skill into a confused-deputy request against other endpoints on the same provider using Meseeks-owned credentials. Search params are safely set through URLSearchParams, but path params do not get equivalent segment encoding.

**Recommendation:** Encode path parameters as path segments with encodeURIComponent or an equivalent segment encoder before replacement. Reject values containing slash, backslash, null bytes, dot segments, query/hash delimiters, or percent-encoded separators unless a specific skill explicitly allows them. Prefer a small URL-template helper that validates all placeholders are consumed safely.

---

### Launcher task detail can render executable MDX from stored task instructions

- **File:** `src/components/Launcher/LauncherDialog.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 267, 269
- **Slug:** xss
- **Confidence:** high

LauncherDialog renders TaskDetail inside the command dialog for the current task on mobile at lines 267-269. Tracing that import shows TaskDetail renders task.instructions with <MDX text={value}>. The shared MDX renderer calls useMDX(text.trim(), true), and useMDX compiles the string with @mdx-js/mdx using format "mdx" and then executes it with run(), without a sanitizer or an expression/JSX disable step. Task instructions are stored task data: convex/tasks.private.ts accepts arbitrary strings for instructions in updateTaskInstructions, and this app's AI/task workflows can write task instructions from user or external content. If an attacker can get malicious MDX into a victim's task instructions, for example through untrusted content processed into a task, opening the launcher on that task can execute arbitrary JavaScript in the victim's browser. The flagged insecure-crypto match in this file is only a regex false positive around DialogDescription; the exploitable issue is this imported render path.

**Recommendation:** Do not render user, AI, or externally influenced task content as executable MDX. Use markdown-only rendering for task instructions and summaries, or change the shared MDX pipeline to reject MDX JSX, ESM, and JavaScript expressions for untrusted content. Keep component-enabled MDX only for trusted app-authored compositions, and make that trust boundary explicit in the renderer API.

---

### Task instructions and summaries execute as trusted MDX

- **File:** `src/components/TaskDetail.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 94, 104
- **Slug:** xss
- **Confidence:** high

TaskDetail renders task.instructions through <MDX text={value}> and task.summary through CollapsibleSummary, which also renders <MDX text={summary}>. The imported MDX component defaults shouldRenderComponents to true, then useMDX compiles the string with @mdx-js/mdx using format: 'mdx' and outputFormat: 'function-body' and immediately runs it with run(). There is no sanitizer, expression ban, component allowlist by trust level, or sandbox boundary. Task instructions and summaries are mutable task data, including data that can be produced by app actions/AI update flows, so malicious content that reaches those fields executes JavaScript in the app origin when the task detail is viewed. Ownership checks stop cross-user reads, but they do not make persisted user/AI-controlled markup safe; an attacker can still exploit this through prompt injection, imported content, or social engineering to run code as the signed-in user.

**Recommendation:** Render task instructions and summaries as non-executable markdown by passing shouldRenderComponents={false} or by switching these surfaces to a hardened markdown renderer. Reserve full MDX/component execution for trusted app-owned composition bodies only. If MDX must remain, add a strict sanitizer/recma policy that rejects ESM, JSX expressions, script-capable attributes, and dangerous components before run().

---

### Untrusted action results are executed as MDX in the main app context

- **File:** `src/components/actions/GenericAction.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 172, 185
- **Slug:** xss
- **Confidence:** high

GenericAction renders short action results through the MDX component when result.length < 280. That MDX component defaults shouldRenderComponents to true, and src/hooks/useMDX.tsx compiles the provided text with @mdx-js/mdx using format "mdx" and then runs the compiled function in the browser. Action results are not a trusted code boundary: generic actions can include output from LLMs, hard-skill HTTP responses, scraped content, or other external data. An attacker who controls or influences a short action result can include an MDX expression such as a fetch/exfiltration expression; when the user expands the result row, it executes in the Meseeks page origin with access to app globals and authenticated browser context. The 280-character display limit is not a mitigation because a working payload fits comfortably under it.

**Recommendation:** Do not run MDX for untrusted action results. Render generic action output as plain text or with a markdown renderer that does not evaluate JSX/expressions. If rich trusted MDX is required elsewhere, split the API into an explicitly trusted component-rendering path and a safe untrusted markdown/text path, and make GenericAction use the safe path by default. Avoid @mdx-js/mdx run() on database, LLM, HTTP, or scraped content unless it is isolated in a sandboxed separate origin.

---

### AI-generated render code runs in an unsandboxed same-origin iframe

- **File:** `src/components/actions/RenderAction.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 77, 82, 112, 114
- **Slug:** xss
- **Confidence:** high

RenderAction takes action.result.text as pre-transpiled render code, passes it to useIframeRenderer, and then renders the resulting HTML with iframe srcDoc. The iframe has no sandbox attribute. srcDoc documents without sandboxing run with the embedding page's origin, and src/lib/iframe-generator.ts injects the supplied code directly into a script block before rendering the Composition component. A malicious or compromised render action can therefore execute JavaScript as soon as the action is viewed, access window.parent / parent.document, read same-origin browser storage, make authenticated same-origin requests as the victim, mutate the app UI, or exfiltrate data. The existing replacement of </script> only prevents breaking the wrapper script; it does not constrain the intentionally executed code. The postMessage source check only filters messages from other windows and does not isolate the iframe from the parent app.

**Recommendation:** Render generated compositions in a sandboxed isolation boundary. At minimum add an iframe sandbox that allows scripts but not same-origin access, for example sandbox="allow-scripts", and keep communication to a narrow postMessage protocol with event.source plus a per-frame nonce. For stronger isolation, serve compositions from a separate origin with a restrictive CSP and no app cookies or storage. Do not rely on prompt instructions or </script> escaping as a security boundary.

---

### Public render shares execute generated code in a same-origin iframe

- **File:** `src/components/actions/RenderActionControls.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 42
- **Slug:** xss
- **Confidence:** high

The share control calls `shareComponent({ actionId: action._id })`, which routes to `convex/components.ts:shareRenderAction` and stores the render action's `action.result.text` as a public component body. That public `/share/:id` route is intentionally outside the authenticated root layout and renders the body through `CompositionFrame`, which uses `<iframe srcDoc={iframeHtml}>` without a `sandbox` attribute. `generateIframeHtml` then injects the render code into a script block. A `srcDoc` iframe without `sandbox` is same-origin with the app, so attacker-controlled render code shared by any account can execute with the app origin when a logged-in victim opens the public share link. That is stored XSS with access to same-origin browser state and authenticated same-origin requests.

**Recommendation:** Render generated compositions in a sandboxed iframe, for example `sandbox="allow-scripts"` without `allow-same-origin`, and keep communication limited to schema-validated `postMessage` events. For stronger isolation, serve shared/rendered compositions from a separate origin. Do not rely on `srcDoc` escaping alone; the code is intentionally executable, so the browser origin must be isolated.

---

### Scraped markdown links render without URL protocol validation

- **File:** `src/components/actions/ScrapeLinkAction.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 79, 134, 156
- **Slug:** xss
- **Confidence:** high

`Success` renders `data.markdown` from the scrape result with `<MDX text={data.markdown} shouldRenderComponents={false} />`. Tracing the renderer shows `shouldRenderComponents={false}` compiles as plain markdown and removes raw HTML, which mitigates direct HTML/JSX injection, but the MDX anchor override still passes `href` directly into `<a href={href} target="_blank">` without an allowed-protocol check. Markdown URL normalization does not reject `javascript:` URLs. An attacker-controlled scraped page can therefore produce a markdown link such as `[open](javascript:...)`; if the user expands the scrape result and clicks it, script can execute under the app origin. The component also renders `action.args['url']` directly as external links in failed and succeeded states, so malformed or malicious action args hit the same unsafe-link surface.

**Recommendation:** Add a shared safe external-link helper and use it for both action URLs and MDX links. Parse URLs with `new URL`, allow only `http:` and `https:` for scraped content, and render disallowed protocols as plain text. For markdown, add a sanitization/transform step that strips or neutralizes unsafe `href` and `src` values before rendering.

---

### Raw MDX task instructions can execute script when rendered

- **File:** `src/components/actions/UpdateInstructionsAction.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 72, 76
- **Slug:** xss
- **Confidence:** high

The update-instructions flow treats `instructions` and `summary` as raw MDX strings. In this component, those fields are accepted as action args at lines 72-79; tracing the same built-in skill shows `skills/builtIn/updateInstructions.ts` persists those values through `internal.tasks._updateInstructions`, and `TaskDetail.tsx` / `CollapsibleSummary.tsx` later render the stored task fields with `<MDX text={...} />`. The MDX renderer defaults `shouldRenderComponents` to true, and `src/hooks/useMDX.tsx` compiles with `format: 'mdx'` and executes the generated function body via `run()` without sanitization. That means malicious MDX expressions or JSX that reach task instructions or summary can run JavaScript in the app origin when the user opens task details or the summary. In this app, those fields can be produced by the AI/updateInstructions action and may be influenced by external content processed by hard/soft skills, so this is not safely confined to trusted static content.

**Recommendation:** Do not render user-controlled or AI-generated task fields as executable MDX. Render task instructions, summaries, and action output with a sanitized Markdown-only pipeline, disable MDX expressions/JSX for those fields, sanitize HTML and URL protocols with a strict allowlist, and reserve component-enabled MDX only for trusted code-owned compositions. If component rendering is required, store a validated structured format instead of arbitrary MDX source.

---

### Untrusted search result URLs are rendered as executable hrefs

- **File:** `src/components/actions/search/SearchResultsPanel.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 135, 203, 209
- **Slug:** xss
- **Confidence:** high

SearchResultsPanel renders result.url directly into an anchor href at line 135. The helper getDisplayUrl parses URLs for display, but it does not enforce an http/https scheme or reject executable schemes. The traced callers SearchWebAction and ValyuSearchAction parse provider/action result URLs as plain strings, so a malicious or compromised search result can supply a value such as javascript:alert(document.domain). React escapes the visible title/description text, but it does not make an unsafe href safe; clicking the result executes script in the app context. The missing target attribute also means the navigation stays in the current browsing context.

**Recommendation:** Normalize result URLs before storing them in SearchDisplayResult. Only allow http: and https: protocols, and render invalid or unsupported schemes as non-clickable text. A small helper should parse with new URL, check protocol against an allowlist, and return undefined for unsafe values. Adding target="_blank" and rel="noopener noreferrer" is fine for external links, but it is not a substitute for scheme validation.

---

### Untrusted MDX is compiled and executed by default

- **File:** `src/components/ui/mdx.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 251, 260, 262, 279
- **Slug:** xss
- **Confidence:** high

The MDX component defaults `shouldRenderComponents` to true, then passes that value into `useMDX(text.trim(), shouldRenderComponents)`. The imported hook compiles `format: 'mdx'` and runs the generated function body with `@mdx-js/mdx`, which means MDX expressions and JSX in the input execute as JavaScript in the app origin. Several callers omit `shouldRenderComponents`, including `GenericAction` for short action results, `TaskDetail` for task instructions, and `CollapsibleSummary` for task summaries. Those values can come from user-edited content, AI-generated task state, or action output such as hard-skill/HTTP responses. A malicious short action result or saved MDX string containing an expression such as `{globalThis.fetch('/api/auth/session').then(...)}` would run when the victim expands/views it. `useSetupWindowGlobals()` also exposes app hooks/utilities on `window`, increasing the impact once arbitrary MDX code runs.

**Recommendation:** Make markdown-safe rendering the default: set `shouldRenderComponents` to false and require an explicit trusted-only component renderer for app-authored MDX. Do not call `@mdx-js/mdx` `run()` on user, AI, scraped, or HTTP response text. For untrusted content, render Markdown only with sanitization and no MDX expressions/ESM/JSX, or use a compiler policy that rejects dynamic expressions before evaluation. Add tests for task instructions, summaries, and action results containing MDX expressions to prove they render as inert text.

---

### Arbitrary skill arguments reach backend built-ins that miss resource ownership checks

- **File:** `src/hooks/useComposer.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 260, 280, 281, 282, 283, 284, 285
- **Slug:** cross-tenant-id
- **Confidence:** high

The composer builds `skills` from queued `skillKey`/`args` values and submits them directly to `api.action.act` (`buildFinalSkills` at line 260, call at lines 280-285). The client is not the real trust boundary, but tracing this call shows the backend `convex/action.ts` only verifies ownership of the conversation task before storing arbitrary skill calls. Privileged built-ins then trust attacker-controlled IDs inside their args: `skills/builtIn/moveTask.ts` parses `args.taskId` and `args.newParentId`, then calls `internal.tasks._move`; `convex/tasks.private.ts` patches that `taskId` without checking that the moved task or destination parent belongs to the acting user. An authenticated attacker can call `action.act` on one of their own tasks with `skillKey: 'moveTask'` and a victim `taskId`; because direct owner-authored actions are auto-authorized by the reactor, the victim task is moved. If moved under an attacker-owned parent, `convex/tasks.ts` can then return it through the parent-child query because that query checks ownership of the parent but filters children only by `parentId`, not by child owner. The same pattern exists for `cancelSchedule`, where attacker-controlled `scheduleId` reaches an internal cancel helper with no schedule ownership check.

**Recommendation:** Fix this on the backend, not in the hook. Make each privileged built-in derive the operated resource from `execution.task` when possible. For operations that must accept IDs, require `execution.task.owner` or current owner context and verify every referenced `taskId`, `newParentId`, and `scheduleId` belongs to that owner before mutation. Harden internal wrappers like `tasks._move` and `schedules._cancel` so they cannot be called without an owner-checked context, and add an owner filter to child task queries.

---

### AI-generated render code executes as same-origin app JavaScript

- **File:** `src/lib/iframe-generator.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 99, 101, 197
- **Slug:** xss
- **Confidence:** high

The scanner-highlighted innerHTML sink is escaped before use, so that specific line is not the bug. The real issue is that generateIframeHtml accepts arbitrary generated code, only rewrites closing script tags, and then interpolates that code directly into an inline script. The render skill accepts user-provided React code, stores the transpiled output as an action result, shareRenderAction copies that result into a public component body, and /share/:id renders it through CompositionFrame. CompositionFrame and RenderAction both place this HTML into iframe srcDoc without a sandbox attribute, so the srcdoc document keeps the Meseeks origin. A logged-in attacker can create a render action containing malicious JavaScript, share it publicly, and send the /share/:id URL to a victim; when opened, the code can access the parent page, make authenticated same-origin requests as the victim, and read origin-scoped browser state available to JavaScript. There is no CSP or sandbox mitigation in the searched code paths.

**Recommendation:** Treat rendered compositions as hostile code. Render them in an iframe with sandbox="allow-scripts" and do not grant allow-same-origin; ideally serve compositions from a separate render origin as well. Add a restrictive CSP inside the generated document, keep postMessage handling explicit, and update all srcDoc callers such as CompositionFrame and RenderAction so this helper cannot be used without isolation.

---

## MEDIUM (26)

### Untrusted action output is injected into future LLM context as trusted structure

- **File:** `convex/magicRock.private.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 374, 380, 421, 427, 429
- **Slug:** agentic-untrusted-prompt-input
- **Confidence:** high

renderHistory loads prior task actions and renderAction serializes each action into XML-like prompt markup. The action result text is inserted raw as `<result>${action.result?.text}</result>` with no escaping or source isolation. Action result text can come from user messages, hard-skill HTTP responses, scraped/search content, or prior model output. An attacker who controls one of those upstream sources can include strings such as `</result><system>...` or forged `<skill>`/`<status>` blocks, causing later soft-skill prompts to treat attacker-controlled content as structural context or instructions. This is not browser XSS, but it is an agentic prompt-injection boundary bug: later model calls are created from this history and can produce tool calls/reactions that enqueue more actions. Budget and approval checks reduce some blast radius, but they do not prevent attacker-controlled content from steering pre-approved/free tools or leaking context into model/tool decisions.

**Recommendation:** Treat action results as untrusted data before adding them to LLM history. Escape XML/HTML metacharacters at minimum, prefer JSON serialization or typed message parts with explicit untrusted-data labels, and avoid giving tool/web output an instruction-like structure. Consider separate tool-result roles/metadata where supported and add prompt policy that forbids following instructions found inside prior result data.

---

### Authenticated transcription endpoint has no size, rate, or billing guard

- **File:** `convex/magicRock.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 37, 39, 44, 47, 56, 59
- **Slug:** expensive-api-abuse
- **Confidence:** high

The public `transcribe` action only checks that a Convex auth identity exists, then sends the supplied ArrayBuffer to Mistral using the server-side `MISTRAL_API_KEY`. There is no maximum audio byte size, duration check, per-user rate limit, balance/energy charge, subscription check, or abuse accounting before the paid API call. Any authenticated account can repeatedly submit large audio payloads and burn provider quota or create avoidable backend load. The SSRF scanner hit is a false positive because the base URL is a constant, but the expensive external API abuse path is real.

**Recommendation:** Add abuse controls before calling Mistral: enforce a strict max byte size and allowed content types, rate-limit per user, charge or reserve account energy for transcription, and consider requiring an app user via `getCurrentUser` so usage is tied to a billable/accountable owner. Reject oversized payloads before creating the Blob/File or making the outbound request.

---

### Timeout handling does not cancel the underlying tool execution

- **File:** `convex/reactor.private.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 50, 67, 71, 152, 162, 164
- **Slug:** expensive-api-abuse
- **Confidence:** high

`perform` races `executeAction` against `runWithTimeout`. On timeout, the catch path calls `finish` with `status: 'failed'` and `costs: []`, which releases any reserved energy. But `runWithTimeout` only rejects the race and clears the timer; it never aborts the underlying work. Hard skills use `fetch` without an `AbortSignal`, so the outbound request can already be in flight, and paid or resource-heavy work may continue after the action has been marked failed and refunded. This makes slow HTTP skills a cheap way to consume server egress and compounds the unrestricted SSRF surface.

**Recommendation:** Thread an `AbortSignal` through `executeAction`, `createTool`, HTTP `fetch`, and LLM calls, and abort it when the timeout fires. Settlement should distinguish between work that was never started and work that was started but timed out; do not automatically refund all costs for started external work unless the underlying provider call was actually cancelled.

---

### AI-facing schedule cancellation lacks an ownership check

- **File:** `convex/schedules.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 22, 23, 24, 25, 37
- **Slug:** cross-tenant-id
- **Confidence:** high

The internal `_cancel` mutation is explicitly exposed for `skills/builtIn/cancelSchedule.ts` and accepts only `scheduleId`, then delegates directly to `cancelSchedule`. The public `cancel` mutation in the same file loads the schedule and calls `ensureTaskOwner` before canceling/deleting it, but the AI-facing internal path does not perform the same ownership check. The built-in cancel schedule tool takes a schedule id from tool arguments, so a user/LLM that obtains another user's schedule id could cancel and delete that user's schedule. The schedule ids are not meant to be authorization boundaries.

**Recommendation:** Make the internal cancellation path verify ownership too. The built-in tool should pass `execution.task._id` or `execution.task.owner`, and `_cancel` should load the schedule and require `schedule.taskId === execution.task._id` or `schedule.owner === execution.task.owner` before canceling. Alternatively, split a trusted low-level helper from an AI/user-facing wrapper that calls `ensureTaskOwner` before deleting.

---

### Task creation accepts foreign parent IDs

- **File:** `convex/tasks.private.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 142, 147, 155, 157, 160, 202, 208, 217, 219, 224
- **Slug:** cross-tenant-id
- **Confidence:** high

addTask and addTaskWithActions accept a caller-supplied `parentId` and write it into the new task without verifying that the parent task exists and belongs to the same owner. The public `tasks.add` route supplies `owner: currentUser._id` but does not ownership-check `parentId` before calling addTask. If an attacker learns or obtains another user's task ID, they can create a task owned by themselves but attached to the victim's task as `parentId`. The victim-side subtask query path checks ownership of the parent and then queries children only by `parentId`, so this can inject attacker-controlled task content into another user's task tree and pollute cross-tenant hierarchy state.

**Recommendation:** When `parentId` is provided, require that the parent exists and `parent.owner === owner` before inserting. Put the invariant in the private helper or pass an already owner-checked parent from the public entrypoint. Also make child-list queries filter by both `owner` and `parentId` so a malformed row cannot cross tenant boundaries even if one is inserted.

---

### Task creation accepts an unchecked parentId and child listing does not filter by owner

- **File:** `convex/tasks.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 77, 82, 175, 185, 188
- **Slug:** cross-tenant-id
- **Confidence:** high

The public tasks.add mutation authenticates the caller with getCurrentUser(), but it accepts parentId from client input and passes it directly into addTask() without verifying that the parent task belongs to the current user. The private addTask helper inserts that parentId as-is. Separately, findAll({ parentId }) checks ownership of the parent task, then queries children only by parentId/isActive via the by_parent_isActive index, without also constraining owner. An authenticated attacker who learns or receives another user's task id can create an attacker-owned task under that victim parent. When the victim lists children for their own parent, the query can return the attacker's injected child row because it is keyed only by parentId. This is a cross-tenant integrity issue and can become data exposure for any attacker-controlled task metadata that later gets populated.

**Recommendation:** In tasks.add, when parentId is provided, call ensureTaskOwner(ctx, { taskId: parentId }) before creating the child. Also change the child listing query to constrain owner as well as parentId, preferably using by_owner_parentId_isActive with currentUser._id and parentId, so malformed or pre-existing cross-owner child rows cannot be returned under another user's parent.

---

### Index health responses disclose absolute private filesystem paths

- **File:** `organizer/src/server/taskIndexRepository.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 48, 50, 100, 112, 154, 156, 203, 207
- **Slug:** other-info-disclosure
- **Confidence:** high

`getGeneratedDir` resolves the generated index directory to an absolute path under `private/tasks/.generated`, and `readTaskIndexSnapshot` includes that `generatedDir` in the returned health object. Parse failures also include absolute JSON file paths in error strings. The public Organizer read server functions return this health object to clients, so any caller can learn the server's repo layout and user-specific path components even when the index is healthy or when parsing fails. The scanner's timing-unsafe signature finding is a false positive: the `signature` here is only a cache fingerprint built from file mtimes and sizes, not a cryptographic signature.

**Recommendation:** Return generic client health such as `isReady`, `generatedAt`, and stable file labels only. Keep absolute paths and parser exception details in server logs, and require auth before exposing any diagnostic detail about private generated indexes.

---

### Passthrough schemas preserve server-only task metadata across the client boundary

- **File:** `organizer/src/server/taskIndexSchemas.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 11, 32, 43, 51
- **Slug:** zod-passthrough-mass-assignment
- **Confidence:** medium

The task index schemas appear to validate a client-safe shape, but `.passthrough()` keeps unknown fields from the generated JSON. The generator currently writes fields such as `absolutePath` into `tasks.meta.json`; because `taskSummarySchema` passes unknown fields through, `TaskSummary` carries that server-only metadata and `buildTaskDetail` later returns it to clients. This is not classic database mass assignment, but it is a trust-boundary bug: validation does not strip fields that were not deliberately approved for the Organizer client, and future sensitive fields added to generated indexes would also survive parsing.

**Recommendation:** Use strict or stripping schemas for client-facing index data. If server tooling needs fields like `absolutePath`, define a separate server-only schema and explicitly project a smaller client-safe type before returning data from server functions.

---

### Valyu provider spend cap is far higher than the app's reserved/charged cost

- **File:** `private/skills/definitions/valyu/valyu_search.ts`
- **Lines:** 10, 11, 28, 39
- **Slug:** expensive-api-abuse
- **Confidence:** medium

The app charges and auto-approves this hard skill at $0.015, but the provider request body sets max_price to 30. The hard-skill execution path settles only skill.cost, not the provider's actual deduction, so a user can repeatedly trigger searches that reserve a tiny amount of Meseeks energy while the Valyu account may spend up to the much larger provider-side cap. The risk is amplified because this skill has a numeric preApprovedCost equal to its low configured cost, allowing companion-triggered runs to proceed without explicit user authorization when the reactor's maxCost check passes.

**Recommendation:** Align max_price with the maximum amount the app reserves and charges, or set preApprovedCost to none for this skill. Parse Valyu's returned deduction amount and settle against the actual provider cost, and add per-user/provider quota controls for paid search APIs.

---

### Recurring schedules allow unbounded high-frequency execution

- **File:** `schemas/scheduleSchema.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 30, 55
- **Slug:** expensive-api-abuse
- **Confidence:** high

The schedule schema accepts arbitrary cron strings for recurring schedules (`cronExpression: z.string()`) without a minimum interval or per-user/task schedule limit. The traced creation path (`skills/builtIn/schedule.ts` -> `internal.schedules._create` -> `convex/schedules.private.ts`) validates only cron syntax with `isExpressionValid`, then uses `ctx.scheduler.runAt` to continuously enqueue `scheduledIteration` actions. The installed `cron-parser` supports second-level schedules such as `* * * * * *`, so an authenticated user can create schedules that fire every second, producing repeated Convex scheduler jobs, DB writes, and reactor work. Budget checks may limit downstream paid LLM calls, but the scheduler/action churn itself is not bounded by this schema or by the traced schedule creation path.

**Recommendation:** Constrain recurring schedules at the validation boundary: require a minimum recurrence interval, cap active schedules per user/task, reject second-level cron expressions unless explicitly needed, and add rate limiting around schedule creation. Store normalized schedule metadata so enforcement does not rely on parsing raw cron strings repeatedly.

---

### Soft-skill output limits are user-controlled but underpriced before execution

- **File:** `schemas/skillSchema.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 108, 112
- **Slug:** expensive-api-abuse
- **Confidence:** high

The soft-skill decision config allows unbounded `maxTokens` and `maxRetries`. Tracing execution shows `maxTokens` is passed directly as `maxOutputTokens` to the AI SDK in `convex/magicRock.private.ts`, while preflight cost estimation in `skills/createAITool.ts` ignores that configured limit and caps estimated output at 8000 tokens. The reactor reserves funds based on that underestimated `maxCost`, then `settleAction` merely logs over-reserve usage and can drive the user's balance negative after the provider cost is already incurred. An authenticated user can create or update a soft skill with a very high output token limit and cause paid model usage beyond the reserved budget and pre-approval calculation.

**Recommendation:** Put explicit schema bounds on `maxTokens` and `maxRetries`, derive those bounds from the selected model where possible, and include the configured `maxTokens` value in `computeMaxCost`. If actual cost can exceed reserved funds, require explicit authorization before execution or stop settlement from charging beyond available account balance after the fact.

---

### Built-in schedule cancellation accepts an arbitrary schedule ID without an ownership check

- **File:** `skills/builtIn/cancelSchedule.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 26, 27
- **Slug:** cross-tenant-id
- **Confidence:** high

The built-in skill takes `args.scheduleId`, only validates that it has the shape of a Convex schedule ID, and then calls `internal.schedules._cancel`. The public `schedules.cancel` mutation verifies ownership through `ensureTaskOwner`, but this internal path bypasses that wrapper. The underlying private `cancelSchedule` helper deletes whatever schedule row matches the ID and cancels its scheduled job without checking that the schedule belongs to `execution.task.owner` or `execution.task._id`. An authenticated user who can learn or obtain another user's schedule ID could enqueue a `cancelSchedule` action from one of their own tasks and cancel the victim's scheduled work.

**Recommendation:** Pass the current task ID or owner into the internal cancellation path and require `schedule.taskId === execution.task._id` or `schedule.owner === execution.task.owner` before cancelling. Reuse one private helper for both public and built-in cancellation so the owner check cannot drift.

---

### Hard-skill headers can be written to logs during skill creation

- **File:** `skills/builtIn/createSkill.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 32, 66
- **Slug:** secret-in-log
- **Confidence:** high

`console.debug('learning skill', args.skill)` logs the full unvalidated skill payload, and `console.debug('skill created', skill)` logs it again after creation. For hard skills, that payload can include `config.headers`, which are explicitly intended to carry HTTP headers and may contain API keys or bearer tokens. Other code already treats hard-skill headers as sensitive by stripping global skill headers from public responses, so logging the full object can disclose user credentials to log sinks when debug logging is enabled.

**Recommendation:** Remove these full-object logs or replace them with redacted metadata such as skill key, kind, method, and hostname. Never log `config.headers`, request bodies, or full hard-skill configs.

---

### Companion can create unbounded recurring schedules without user approval

- **File:** `skills/builtIn/schedule.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 9, 27, 33, 54, 59, 68
- **Slug:** rate-limit-bypass
- **Confidence:** high

The schedule skill is marked as pre-approved at zero cost on line 9 and accepts arbitrary recurring cron input and instructions on lines 27-38. Its execution then immediately calls internal.schedules._create on lines 54-69 using the current task owner and the current action as author. In the reactor authorization logic, zero-cost companion actions are auto-authorized because preApprovedCost 0n is not less than maxCost 0n, and the consecutive companion action guard only runs when maxCost > 0n. The iterate soft skill exposes schedule as an available tool, so prompt-injected or otherwise compromised model output can create persistent future automation without an explicit owner approval step. The internal scheduler path has no schedule quota, no per-task dedupe, and no minimum recurrence interval, so an attacker who can influence the companion can cause repeated scheduledIteration/iterate chains that consume task/account energy or create scheduler/action spam later without another click.

**Recommendation:** Treat schedule creation, especially recurring schedules, as a sensitive operation. Set preApprovedCost to 'none' or require explicit owner approval before persisting a schedule, enforce per-user/per-task schedule quotas, enforce a minimum recurrence interval, dedupe equivalent schedules, and validate these limits inside the internal createSchedule helper rather than relying on prompt instructions.

---

### Companion can persist arbitrary userInfo without a real authorization gate

- **File:** `skills/builtIn/setUserInfo.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 6, 8, 23, 24, 25, 26
- **Slug:** other-persistent-prompt-injection
- **Confidence:** high

setUserInfo is a durable preference mutation, but line 6 marks it pre-approved at zero cost and line 8 only tells the model in natural language to use it when the user explicitly asks. The handler then writes arbitrary args.userInfo into the current task owner's userInfo preference on lines 23-26. The iterate skill exposes setUserInfo as an available tool, and the reactor auto-authorizes zero-cost companion actions; there is no server-side check that the owner requested or approved the memory update. magicRock.private later injects this stored userInfo value directly into model instructions when templates contain {{userInfo}}, so a prompt-injected model can persist malicious instructions or false profile data that poisons future task contexts. This is an integrity issue for a high-value preference field and can become a durable prompt-injection primitive.

**Recommendation:** Require explicit owner approval before writing userInfo, for example by setting preApprovedCost to 'none' or routing proposed memory changes through a review UI. Store structured, bounded profile fields where possible, record provenance for updates, and inject saved userInfo into LLM prompts as quoted untrusted data with clear delimiters rather than as free-form instruction text.

---

### Hard skill update logs can expose configured headers

- **File:** `skills/builtIn/updateSkill.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 25, 58
- **Slug:** secret-in-log
- **Confidence:** high

`updateSkill` logs both `args.skill` and the parsed `skill` object with `console.debug`. For hard skills, that object can include `config.headers`, which the schema describes as HTTP headers to send with requests and which the rest of the codebase already treats as potentially password-bearing by stripping headers from public/global hard-skill responses. If debug logging is enabled or captured by local/cloud observability, API keys, bearer tokens, cookies, and other credentials supplied in a hard-skill configuration can be written to logs.

**Recommendation:** Remove full skill-object logging. Log only non-sensitive identifiers such as skill key, kind, and action id, or add a dedicated redaction helper that removes `config.headers`, authorization-like keys, cookies, tokens, passwords, and secret-looking values before anything reaches logs.

---

### Soft skill preflight cost can under-reserve expensive model output

- **File:** `skills/createAITool.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 156, 157, 158, 159, 185, 186, 187, 191, 192, 195, 196, 197, 198, 201, 202
- **Slug:** expensive-api-abuse
- **Confidence:** high

computeMaxCost estimates output cost as min(8000, inputTokens / 4) and does not account for the soft skill's configured maxTokens. The runtime context passes skill.config.maxTokens through as maxOutputTokens in convex/magicRock.private.ts, and schemas/skillSchema.tsx leaves maxTokens unbounded. A malicious client can create or update a soft skill with a small prompt, expensive model, and very high maxTokens. The reactor will reserve based on the capped estimate, but runtime can generate far more output and settle the overage afterward. reactor.accounting only logs when actual cost exceeds reserved energy and then patches the user balance by a negative delta, so this bypasses the task/account budget gate and can push spend beyond the preflight authorization decision.

**Recommendation:** Make preflight reserve the maximum billable output implied by skill.config.maxTokens and provider limits, not a fixed 8000-token heuristic. Add schema caps for maxTokens and maxRetries, include retries and tool schema serialization in worst-case estimates, and reject execution when actual cost would exceed reserved budget instead of allowing negative settlement as normal flow.

---

### HTTP responses are fully buffered before truncation

- **File:** `skills/createHttpTool.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 66, 75, 137, 143, 147, 148
- **Slug:** other-resource-exhaustion
- **Confidence:** high

The code calls response.text() before applying MAX_HTTP_RESPONSE_BODY_BYTES. That means an attacker-controlled hard skill URL can return a huge or slow response and force the Convex action to buffer it in memory until timeout or failure. The later truncation only limits what is stored in the database; it does not limit network reads, memory pressure, runtime, or provider/serverless cost.

**Recommendation:** Use AbortController with a short hard timeout, check Content-Length when present, stream the body through a byte-counting reader, abort once the configured maximum is reached, and store only the bounded prefix. Apply the same cap before including response text in thrown errors.

---

### Voice transcription path exposes paid Mistral API without server-side rate or size limits

- **File:** `src/components/ActionComposer/ActionComposer.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 66, 202
- **Slug:** expensive-api-abuse
- **Confidence:** high

ActionComposer wires the microphone UI into useVoiceRecording at line 66 and exposes startRecording through the idle composer controls at line 202. Tracing that hook shows it calls api.magicRock.transcribe with the recorded audio ArrayBuffer. The backend action in convex/magicRock.tsx only checks that ctx.auth.getUserIdentity() exists before wrapping the caller-controlled ArrayBuffer in a Blob/File and POSTing it to https://api.mistral.ai/v1/audio/transcriptions with the server-side MISTRAL_API_KEY. I found no byte-size cap, duration cap, per-user rate limit, quota, task ownership/budget check, or energy charge before the outbound paid API call. Because Convex actions are callable directly by an authenticated client, an attacker does not need to use MediaRecorder or the UI; any signed-in account can repeatedly submit large ArrayBuffers and consume Mistral credits / Convex resources. The scanner's dev-auth-bypass hit on this file is a false positive, but this reachable expensive API abuse issue is real.

**Recommendation:** Enforce controls in convex/magicRock.tsx before the Mistral fetch: validate audio.byteLength against a strict maximum, restrict accepted content types to the actual formats supported, add per-user rate limiting, and either charge/reserve task/account energy or gate transcription behind an entitlement. Client-side recording limits can improve UX, but they are not a security control because callers can invoke the Convex action directly.

---

### Client bundle contains hardcoded personal information

- **File:** `src/components/ActionTest.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 12, 19
- **Slug:** other-info-disclosure
- **Confidence:** high

The default test fixture embeds detailed real personal data in a client-side component: full name, date of birth, birthplace, places lived, citizenship, profession, languages, and social handle. This is not crypto despite the scanner hit; the real issue is information disclosure. The component is statically imported by src/components/ui/mdx.tsx and included in the production MDX component registry, so this string can be shipped in the browser bundle and inspected by users even if the test UI is not intentionally exposed.

**Recommendation:** Replace the fixture with synthetic data and move dev/test-only components out of the production MDX registry. Add a check to keep real user PII, credentials, and production-like records out of client fixtures.

---

### Feedback submission can be spammed server-side

- **File:** `src/components/FeedbackDialog.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 41, 79, 82, 137
- **Slug:** rate-limit-bypass
- **Confidence:** high

The dialog uses only client-side submission state to prevent repeated sends, then calls api.users.requests.submit with arbitrary feedback context. Tracing that mutation shows authentication is enforced in convex/users/requests.ts, but there is no server-side rate limit, quota, duplicate suppression, or bounded schema for the optional context object; convex/users/requests.private.ts explicitly leaves duplicate checks disabled and logs the whole request with console.warn before inserting it. An authenticated attacker can bypass the UI and repeatedly call the mutation to fill user_requests and trigger noisy admin/log notifications.

**Recommendation:** Enforce a Convex-side per-user/per-key rate limit and reasonable daily quota before inserting. Bound the context schema to known fields and sizes, and avoid warning/logging full user-controlled request bodies; log metadata such as owner, key, and request id instead.

---

### Question submission can be spammed server-side

- **File:** `src/components/QuestionDialog.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 33, 48, 50, 107
- **Slug:** rate-limit-bypass
- **Confidence:** high

The dialog disables the submit button while a request is pending, but that is only a browser control. The component calls the shared api.users.requests.submit mutation with key general_question; tracing the backend shows the mutation authenticates the user but does not enforce any server-side rate limit, quota, or duplicate suppression before inserting a user_requests row, and the private helper logs the request with console.warn. An authenticated attacker can call the mutation directly and repeatedly to create database spam and admin/log noise.

**Recommendation:** Add server-side rate limiting and quota checks to api.users.requests.submit, ideally keyed by owner and request key. Keep the UI disabled state for ergonomics, but do not treat it as abuse protection.

---

### Voice transcription path is not server-side rate limited or budgeted

- **File:** `src/components/QuickSeek.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 78, 84, 86, 216
- **Slug:** expensive-api-abuse
- **Confidence:** high

QuickSeek wires the microphone flow through useVoiceRecording and exposes it via the Mic button. Tracing that hook shows it sends the full recorded ArrayBuffer to api.magicRock.transcribe. The Convex transcribe action only checks that some identity exists, then forwards the uploaded audio to Mistral with the server API key; it does not enforce a max audio byte size, max recording duration, per-user rate limit, quota, or account-energy charge before calling the paid provider. An authenticated attacker does not need to use this UI and can call the public Convex action repeatedly with arbitrary ArrayBuffers to drive provider spend and consume backend memory/bandwidth. The auth check prevents anonymous abuse, but it does not mitigate abuse by any signed-in account.

**Recommendation:** Enforce the control at the Convex action boundary: reject audio above a strict byte limit, cap accepted content types, add per-user rate limits/quotas, and charge or reserve account energy before calling Mistral. Client-side recording duration limits are useful UX, but they are not a security boundary.

---

### Public skill list loads full hard-skill configuration into the browser

- **File:** `src/components/skills/SkillListContent.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 22, 23, 70, 73
- **Slug:** other-info-disclosure
- **Confidence:** medium

When `filter` is `public`, `SkillListContent` selects `usePublicSkills()` and loads the result into client-side React Query state before passing each full `Doc<'skills'>` to `SkillCard`. Tracing that hook shows it calls `api.skills.findAllPublic`; the Convex handler intentionally blanks `config.headers` for `isPro` hard skills, but still returns the rest of each hard-skill config, including `config.url`, `method`, `paramMappings`, optional `body.template`, `inputSchema`, and `knownReactions`. The card only needs display metadata, so any user who can open the public skills page can inspect implementation details for app-managed HTTP skills in browser state. Header redaction prevents direct API-key disclosure, but this still leaks protected integration structure and backend service endpoints/templates that should stay server-side under the project threat model for hard-skill configs.

**Recommendation:** Return a redacted public projection for list/card UI instead of full `Doc<'skills'>`. For public hard skills, omit `config` entirely or expose only non-sensitive summary fields needed by the card, backed by a dedicated Zod schema such as `publicSkillSummarySchema`. Keep full hard-skill configs behind owner-checked or internal Convex functions only.

---

### Queue size limit is only enforced client-side

- **File:** `src/hooks/useComposer.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 9, 157, 185, 260, 280, 282
- **Slug:** expensive-api-abuse
- **Confidence:** high

`MAX_QUEUE_SIZE` is enforced by the hook's `enqueue` and `addEnergyIncrease` paths, but `submit` sends the final `skills` array to `api.action.act` as-is. Tracing the backend shows `convex/action.ts` accepts `z.array(...).min(1)` with no `.max(...)`, and `addActions` inserts every item before kicking the reactor. A direct Convex client can bypass this hook and enqueue an unbounded batch of zero-cost built-in actions against an owned task, causing database writes, scheduler work, logs, and reaction processing beyond the intended 16-action cap.

**Recommendation:** Move the action-count limit to the public backend boundary. Share a server-side constant or schema with `convex/action.ts`, add `.max(16)` or the intended cap to the `skills` argument, and add per-user/task rate limiting for action creation so direct API callers cannot bypass UI limits.

---

### Production build emits public source maps

- **File:** `vite.config.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 44, 45
- **Slug:** other-info-disclosure
- **Confidence:** high

The Vite build is configured with `sourcemap: true`, which emits JavaScript source map files and sourceMappingURL references for production builds. The Sentry Vite plugin is present, but it is not configured with `sourcemaps.filesToDeleteAfterUpload` or an equivalent deployment exclusion, so the generated `.map` artifacts can be deployed alongside public client assets. An attacker can fetch those maps to recover original frontend source, comments, route names, internal feature logic, and other implementation details that should not be exposed from the production bundle. The `process.env['VERCEL_GIT_COMMIT_SHA']` value itself is not a secret; the issue is the public source map emission.

**Recommendation:** Generate source maps for Sentry without publishing them. Use hidden source maps where appropriate and configure `sentryVitePlugin({ sourcemaps: { filesToDeleteAfterUpload: [...] } })` for the actual Vercel/TanStack output map paths, or otherwise exclude `.map` files from public deployment after upload.

---

## HIGH_BUG (5)

### Renewal activation is not idempotent and can double-credit duplicate webhooks

- **File:** `convex/subscriptions.private.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 36, 39, 50, 51, 52, 59, 65, 66, 67, 68, 69, 70, 71
- **Slug:** other-idempotency-bug
- **Confidence:** high

`activateSubscription` skips the `subscription.status === 'pending'` guard when `isRenewal` is true, then increments `renewalCount`, updates renewal timestamps, and adds subscription credits on every call with `credits > 0n`. Webhook providers commonly retry or duplicate delivery, but this function does not check a Polar order id, webhook id, processed-event table, or any other idempotency key before mutating state. A duplicate `subscription_cycle`/renewal activation can therefore grant the same subscription credits multiple times and corrupt renewal accounting.

**Recommendation:** Pass a stable Polar order id or webhook id into `_activate`, store processed payment events behind a unique index, and make duplicate events return success without changing subscription state or adding credits. For renewals, also verify the Polar subscription id, product id, customer external id, and amount against the stored subscription before crediting.

---

### Paid top-ups can be permanently rejected if the user discards while the webhook is in flight

- **File:** `convex/topUps.private.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 67, 70, 72, 74
- **Slug:** other-payment-state-race
- **Confidence:** high

finishTopUp only credits a top-up when the stored status is exactly 'waiting'. If the owner discards the top-up before the signed Polar order.paid webhook is processed, the status becomes 'discarded by user' and finishTopUp throws 'Top up is not waiting'. Because the webhook handler calls this mutation for the paid event, the payment is then never converted into a confirmed top-up transaction or account balance credit. This is a payment-state race: the user can pay, return while the row still says waiting, discard it, and make subsequent webhook retries fail the same status check.

**Recommendation:** Treat the signed paid webhook as authoritative for an existing checkout. Either prevent discard once checkout payment has been started/cannot be canceled, or make finishTopUp idempotently confirm a matching paid checkout even if the local row was discarded. If discarded paid events should require manual review, persist a distinct paid-after-discarded state instead of throwing and losing the credit path.

---

### Discard can invalidate a paid checkout before the webhook credits the user

- **File:** `convex/topUps.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 94, 100, 104, 106, 108
- **Slug:** other-payment-state-race
- **Confidence:** high

The public discard mutation lets the owner change any 'waiting' top-up to 'discarded by user'. A Polar checkout remains 'waiting' locally until the webhook is processed, so a user can still discard after paying if they return before the webhook lands or call the mutation directly. The webhook path later calls finishTopUp, which refuses non-waiting rows, so this local discard can block crediting a real paid checkout. The ownership check is correct, but the payment state transition is unsafe.

**Recommendation:** Do not let a local discard be the final authority over an external checkout that may already be paid. Add a cancel/expired state only when the Polar checkout is canceled or safely abandoned, disable or harden discard after payment navigation, and make the webhook confirmation path override or reconcile discarded waiting rows for signed paid events.

---

### Concurrent task mutations can lose edits or corrupt task state

- **File:** `organizer/src/server/taskMutationRepository.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 577, 578, 580, 583, 617, 618, 620, 623, 750, 753, 758, 784, 787, 792
- **Slug:** other-race-condition
- **Confidence:** high

The mutation helpers use check-then-write/check-then-rename flows with rollback but no lock, revision check, or mutation queue. Two concurrent requests can operate on the same stale generated snapshot. For example, `updateTaskTags` and `updateTaskTitle` each read the whole original file and then write a whole-file replacement; whichever write lands last can erase the other change. If a rebuild fails, rollback writes the old whole-file content back, which can also undo a mutation that succeeded in another request. The move/rename/mark-done paths have the same race shape around rename plus rollback.

**Recommendation:** Serialize filesystem mutations globally or per task, re-read and validate the current file/index state immediately before writing, and use atomic temp-file replacement for content updates. Rollbacks should only revert the specific operation when the file is still in the expected intermediate state.

---

### Discarded top-ups can still be paid externally but will not credit the user

- **File:** `src/routes/top-up_.$id.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 99, 103
- **Slug:** other-payment-state-desync
- **Confidence:** high

The route exposes both actions for a waiting top-up: `Discard` calls `api.topUps.discard` with the current `topUpId`, while `Pay` redirects the browser to the already-created `topUp.paymentUrl`. Tracing the backend shows `convex/topUps.ts` only patches the row to `status: 'discarded by user'`; it does not cancel or expire the Polar checkout. The webhook completion path in `convex/topUps.private.ts` then refuses to finish any top-up whose status is not `waiting` before adding the balance transaction. That means a user can open the Polar checkout, return/back out and discard the top-up in the app, then still complete the external Polar payment. The `order.paid` webhook will fail with `Top up is not waiting`, no top-up transaction is inserted, and the user's balance is not credited despite successful payment.

**Recommendation:** Make the backend payment state authoritative. Either cancel/expire the Polar checkout when discarding, or allow a verified `order.paid` webhook for a matching `paymentId` to transition `discarded by user` to `confirmed` and credit the balance. Also make webhook handling idempotent and persist a reconciliation state instead of returning 500 for paid-but-non-waiting checkouts.

---

## BUG (10)

### Migrations return full documents instead of partial patches

- **File:** `convex/migrations.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 27, 38, 47
- **Slug:** other-migration-logic-bug
- **Confidence:** high

`@convex-dev/migrations` treats a non-empty value returned from `migrateOne` as the patch object to apply to the current document. Both migrations return the full `doc` for unchanged rows, and `backfillActionDetailsHistory` returns `{ ...doc, llm: ... }` for changed rows. That means the runner will try to patch every row with the entire document, including system fields like `_id` and `_creationTime`, which can make the migration fail or at minimum perform pointless writes. In `enableMissingSkillsFour`, the side-effect calls to `enableSkill` are in the same migration transaction, so a bad final patch can roll back the actual preference updates too.

**Recommendation:** Return `undefined` for unchanged rows and return only the fields that should be patched. For `enableMissingSkillsFour`, perform the side effects and return nothing. For `backfillActionDetailsHistory`, return `{ llm: { ...doc.llm, history: [] } }` only for soft-skill rows missing history.

---

### Task energy can be decreased below zero

- **File:** `skills/builtIn/decreaseBudget.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 10, 18, 20
- **Slug:** other-logic-bug
- **Confidence:** high

The skill accepts any non-negative bigint amount and passes it directly to `internal.tasks._decreaseBudget`. The private helper subtracts the amount from both `energyBudget.total` and `energyBudget.available` without checking the current budget. A direct user action or approved companion action can therefore set a task's total energy policy to a negative value, leaving corrupted budget state and causing future energy checks to behave as an overrun or block further work unexpectedly.

**Recommendation:** Enforce budget invariants before patching: reject amounts greater than the current total, or compute the new total from spent energy and clamp available/total according to the intended policy. Keep `energyBudget.total` non-negative.

---

### Invalid timezone can persist a one-time schedule even though the action fails

- **File:** `skills/builtIn/schedule.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 14, 54, 81
- **Slug:** other-logic-bug
- **Confidence:** high

The schedule skill accepts timeZone through timeZoneSchema on line 14, but that schema is only a string description, not an IANA timezone validator. For one-time schedules, the internal _create mutation is executed first on lines 54-69 and can insert/schedule the job without using the timezone. Only afterward does the skill format the success message with formatScheduledTime on line 81. An invalid timezone will make Intl formatting throw after the mutation has already committed, causing the action to be recorded as failed while the one-time scheduled job remains active and can still run later. That creates misleading task history and unexpected future execution.

**Recommendation:** Validate timeZone before calling internal.schedules._create, preferably with a shared schema/refinement that checks Intl.supportedValuesOf('timeZone') or a safe Intl.DateTimeFormat construction. Also move all post-create formatting that can throw ahead of the mutation, or make createSchedule validate the same timezone before inserting/scheduling.

---

### Empty tool-call result crashes after warning

- **File:** `skills/createAITool.ts`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 81, 87, 88, 101, 102, 103
- **Slug:** other-logic-bug
- **Confidence:** high

When finishReason is tool-calls but toolCalls is empty, the code logs a warning and then immediately dereferences toolCalls[0].toolName and toolCalls[0].input. Provider anomalies or SDK edge cases in this state will crash the action after the model call, producing a failed action instead of a controlled fallback. This is not a direct security issue, but it is a real reliability bug in the action execution path.

**Recommendation:** Return a controlled say/error result or throw an explicit validated error before dereferencing toolCalls[0]. Persist the LLM details first if debugging data is needed, then fail cleanly with a bounded message.

---

### Conditional hook call can crash live debug cost rendering

- **File:** `src/components/DebugAction/ActionCostSection.tsx`
- **Lines:** 12, 14
- **Slug:** other-react-hook-order
- **Confidence:** high

CostSection returns null before calling useState when an action has neither maxCost/estimatedCost nor actual costs, then calls useState once costs appear. Convex action documents are reactive and reactor code patches maxCost after an action is initially inserted, then later patches final costs, so the same mounted CostSection can realistically transition from the early-return path to the hook path. React can throw a hook-order error in debug mode as live action cost data arrives. The scanner's insecure-crypto hit is a false positive: this file contains no cryptography or cipher selection.

**Recommendation:** Move the useState call above the early return, or render a stable child component only after the cost data exists. Keep all hooks unconditional within each component.

---

### Conditional hook call can crash the history panel

- **File:** `src/components/DebugAction/MessageHistorySection.tsx`
- **Lines:** 11, 20
- **Slug:** other-react-hook-order
- **Confidence:** medium

MessageHistorySection returns before calling useState when messages is empty, then calls useState when messages is non-empty. That violates React's hook ordering rule for the same component instance. The current persisted LLM history is usually created up front, so this is not a security issue and may not be hit often, but if action details are revalidated, patched, migrated, or otherwise change from empty to non-empty while the debug panel is mounted, React can throw a hook-order error and break the debug UI. The XSS-looking template interpolation at line 60 is not exploitable: roleColorFor maps role values to fixed Tailwind classes and the role text itself is rendered as escaped React text, not raw HTML.

**Recommendation:** Call useState before the empty-history return, or split the empty and non-empty render paths into separate child components so every component has stable hook order across renders.

---

### TaskList ignores its parentTaskId prop

- **File:** `src/components/Inbox.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 12, 23
- **Slug:** other-logic-bug
- **Confidence:** high

TaskList accepts parentTaskId and is used from src/components/layout/Task.tsx with a task-specific parentTaskId, but the prop is never used. The component always calls usePaginatedSubtasks with only pagination options, and that hook always queries api.tasks.findAllAtInboxPaginated. Result: task views that expect a child-task list can render the signed-in user's inbox instead of the selected task's subtasks. This is not an XSS issue from the className template literal because React escapes attribute values, but it is a real behavior bug.

**Recommendation:** Thread parentTaskId through the paginated hook and backend query, using the existing owner-checked tasks.findAll path or a new parent-aware paginated query. If this component is intentionally inbox-only, remove the parentTaskId prop and the Task.tsx caller plumbing.

---

### Malformed updateInstructions args can crash the conversation UI

- **File:** `src/components/actions/UpdateInstructionsAction.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 12
- **Slug:** other-client-dos
- **Confidence:** high

`argsSchema.parse(action.args)` runs before the status switch. Public action creation validates `args` only as a generic record before inserting the action, while skill-specific validation happens later during execution. A malformed `updateInstructions` action, for example one with more than 16 `availableSkills`, will throw during React render even for enqueued, skipped, or failed actions. `TaskConversation` maps actions directly through `Action` without a per-action error boundary, so one bad historical action can break the task conversation view instead of showing a safe fallback.

**Recommendation:** Use `safeParse` and render a fallback/GenericAction for invalid args, or parse only inside the branches that actually need parsed args. Also consider validating built-in skill args before inserting actions so malformed actions cannot enter the history.

---

### Invalid stored schedule timezone can crash schedule rendering

- **File:** `src/components/schedules/ScheduleItem.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 30, 150, 154, 157, 159, 160
- **Slug:** other-invalid-timezone-render-crash
- **Confidence:** high

TaskScheduleCompactItem sets its title from formatScheduleHover, which passes schedule.timeZone directly into Date.toLocaleString. JavaScript throws a RangeError for invalid IANA timezone names. The traced data path accepts timezone as a string in the schedule schema and schedule creation flow, so malformed stored schedule data can make the compact schedule list fail during render. This is not a cross-user security issue, but it is a persistent UI denial-of-service/data quality bug for the affected schedule owner.

**Recommendation:** Validate timeZone at schedule creation with a real IANA timezone check, for example by constructing Intl.DateTimeFormat with the supplied zone or checking Intl.supportedValuesOf('timeZone') where available. Also guard schedule rendering with a safe fallback such as UTC or the raw timestamp when legacy data contains an invalid timezone.

---

### Composer clears local and server draft before action submission succeeds

- **File:** `src/hooks/useComposer.tsx`
- **Recent committers:** Igor Silva <igor@igorsilva.pro>
- **Lines:** 275, 276, 277, 280, 285, 286, 287, 288
- **Slug:** other-data-loss
- **Confidence:** high

`submit` adds optimistic pending items and calls `clear()` before starting `act`, then fires `act(...).finally(...)` without awaiting or catching it. Callers awaiting `submit` get a resolved promise even though the backend mutation may still fail. On network/auth/backend failure, the message and queue have already been cleared locally and `draftSync.clear()` has cleared the server draft, so the user's composed work can be lost with no restoration path or error surface.

**Recommendation:** Await the `act` mutation or keep an explicit recoverable snapshot. Clear the local/server draft only after the backend accepts the action batch, and on failure restore the queue/message, remove the pending strip items, and show an error toast. If background submission is intentional, still attach a `.catch(...)` and preserve the draft until success.

---


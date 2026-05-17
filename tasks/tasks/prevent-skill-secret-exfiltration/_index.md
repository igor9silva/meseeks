---
title: Prevent global skill secret exfiltration via getSkillDetails
priority: high
tags: [security, status:backlog]
---

# Prevent global skill secret exfiltration via getSkillDetails

The security audit found that `convex/skills/builtIn/getSkillDetails.ts` returns serialized full skill documents. `convex/skills/private.ts::_findOne` resolves global `isPro` skills first, so hard-skill configs with secret headers can be exposed in model or user-visible responses.

## Objective
Keep skill inspection useful while guaranteeing no sensitive config values can be returned.

## Subtasks
- [ ] Replace raw skill serialization with a sanitized response payload.
- [ ] Redact or omit sensitive fields for hard skills (`config.headers`, auth fields in request templates).
- [ ] Add a shared skill sanitizer helper and reuse it in all detail-return paths.
- [ ] Add tests for global hard skills and user hard skills that include secrets.
- [ ] Review related paths and verify no raw hard-skill config is returned.

## Progress Log
### 2026-05-12
- Moved public and left as a standalone security task. This also absorbs the audit finding about partial public skill redaction.

### 2026-02-09
- Task created from Convex security audit finding.

## Notes
Primary files: `convex/skills/builtIn/getSkillDetails.ts`, `convex/skills/private.ts`.

Sources:
- [Security findings audit](../../references/security-findings-audit/_index.md)
- [DeepSec vulnerability scan](../../references/deepsec-vulnerability-scan/_index.md)

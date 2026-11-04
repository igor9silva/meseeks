# Skill schemas — phase 2

The phase-2 code accepts versioned JSON Schema only. It removes the Zodex reader, converter, skill migration runner, audit entrypoint and deployed rollout verifier. The phase-1 implementation and execution procedure remain in [PR #85](https://github.com/igor9silva/meseeks/pull/85) and its [versioned runbook](https://github.com/igor9silva/meseeks/blob/8ce688290993c654beca08571d7b79c149042b9c/apps/meseeks/scripts/skill-schema-migration.md).

## Evidence before phase 2

The complete read-only audit on 2026-11-04 projected only `skills._id`, `skills.key` and `skills.inputSchema`, using `by_owner_kind` and pages of 25 until `isDone`. The records were kept in private temporary files outside the repository. Revalidation with the phase-2 reader found:

| Source | Current | Pending | Blocked |
| --- | ---: | ---: | ---: |
| Production (`wary-dogfish-609`) | 35 | 0 | 0 |
| PR #85 Preview (`hip-elephant-209`) | 2 | 0 | 0 |
| Private catalog definitions | 54 | 0 | 0 |

Catalog checks evaluated only schema expressions and their constant dependencies, without executing provider configuration. The published phase-1 Preview passed its transactional creation/editing/catalog/BigInt verification and rolled back all synthetic writes. All 23 built-in definitions could be announced through the AI SDK. These checks establish schema and backend compatibility; they do not establish browser UI or external-provider behavior.

These audits establish phase-1 migration completion. Phase 2 is published only to its PR Preview, not production. Keep Preview verification tied to the exact PR head before release. Use Vercel CLI/MCP, never personal Chrome. Shared DEV is outside this rollout and is not a completion gate. Merging the exact PR into `main` requires Igor's explicit authorization; implementation, passing checks and a request to continue the rollout do not authorize that merge.

## PR #86 Preview verification

The isolated [PR #86 Preview](https://meseeks-git-skill-schema-cleanup-ispro.vercel.app) uses `wandering-hyena-568`, selected by `preview/skill-schema-cleanup`. The published backend passed synthetic creation/editing, catalog import, rejection of legacy input and exact persisted BigInt checks through its existing endpoints. The catalog was restored to its two seed entries. One synthetic QA user and personal skill remain in this Preview; no production or shared DEV data was changed by these checks.

The home page returned HTTP 200 through Vercel CLI authentication. All 21 visible built-ins returned current schemas; the local suite covers all 23, including hidden definitions. These checks do not cover authenticated browser UI or calls to external providers.

## Permanent format

- `skills.inputSchema` remains a string. Incoming documents must declare `$schema` or `x-meseeks-schema-version: 1`; saving normalizes the document to the current version. Unknown versions, codecs, unsupported keywords, external references and excessively large/complex schemas fail validation. Unmarked Zodex documents and bare `{}` are rejected.
- BigInt uses decimal strings at JSON boundaries, tagged with `x-codec: "bigint-decimal-v1"`. `x-bigint` stores exact bounds and divisors as decimal strings. The runtime restores BigInt and accepts existing Convex BigInt arguments; imprecise JS numbers are rejected. Money and stored action arguments remain BigInts.
- `x-zod-strip`, `x-zod-prefault`, `x-zod-optional`, `x-zod-readonly` and `x-zod-tuple-length` remain supported. Migrated documents use them to preserve stripping, validated defaults, optional-before-default ordering, readonly outputs and tuple input length. Removing Zodex does not remove these semantics.
- AI providers receive standard JSON Schema without application annotations. Internal execution uses the same AI SDK validator, with built-in runtime refinements preserved after decoding.
- `lib/persistedSkillSchema.ts` owns reading, validation and normalization. `lib/skillJsonSchema.ts` adapts native Zod conversion and restores codecs/annotations. `lib/zodToString.ts` keeps the serializer import used by the private catalog; it writes the current format and contains no legacy reader.

`lib/fixtures/skill-schemas.json` contains synthetic JSON Schema documents converted from the original compatibility fixtures. Their expected results still come from unpatched Zodex 3 / Zod 3. They test the migrated contract without retaining a legacy converter or including real database schemas.

The approved enum correction remains enforced while keeping the field optional. Repaired empty roots remain parameterless object schemas that strip extra fields. These intentional changes are covered separately from the original compatibility oracle.

## Backups and recovery

Keep `legacyInputSchema` optional and retain existing copies through phase 2. New records need no backup. User edits leave existing copies intact; catalog imports cannot create or replace them. Removing or restoring recovery copies is separate reviewed work, with no automatic deletion or retention deadline in this change.

The phase-1 release is the rollback target because it reads both formats. Never roll back to Zodex-only code. Restoring a backup must account for later edits, and a legacy string must not be written into `inputSchema` while the phase-2 reader is active. This migration does not populate optional fields in other domains.

If an old writer reintroduces an unmarked schema before release, stop the release and identify that writer. Use the versioned phase-1 implementation for any separately reviewed recovery; do not silently relax the phase-2 reader.

## Maintenance gate

The app, shared UI and root tooling pin Zod to `4.6.7` because the native importer is experimental and the adapter inspects schema definitions. Deployment runs `bun run test:schemas` and the Preview selection regression tests before publishing. A Zod update must pass that suite and both app/Convex typechecks.

On Vercel, the Preview name comes from `VERCEL_GIT_COMMIT_REF`, not the checkout's possibly unrelated branch name. Local worktrees continue following their current Git branch. This prevents separate PRs from deploying into a shared `preview/master` backend.

Keep coverage for exact BigInt bounds, optional/default ordering, stripping, tuples, references, `allOf` siblings and arrays without `items` before removing any adapter behavior. Local Convex tests retain creation/editing/catalog backup protection and BigInt tool execution after the deployed verification endpoint is removed.

# Skill schema migration — phase 1

This release writes versioned JSON Schema and reads both that format and unmarked Zodex 3 documents. The application no longer depends on Zodex. `skills.inputSchema` remains a string; `legacyInputSchema` is an optional recovery copy written by the migration. Money, balances and existing action arguments remain Convex BigInts.

Run these commands from `apps/meseeks` using the existing authenticated Convex CLI. Use the same deployment selector for every command. Omit `--prod` for the configured development deployment, or use `--deployment-name <name>` for an explicit deployment. These commands do not deploy code.

## Before deployment

Use the native Convex MCP's `runOneoffQuery` with the deployment selector returned by `status`. It executes a temporary, read-only query without publishing application code. The audit needs only `skills._id`, `skills.key`, and `skills.inputSchema`; do not export the production database or retrieve other tables.

```js
import { query } from 'convex:/_system/repl/wrappers.js';

export default query({
	handler: async (ctx) => {
		const result = await ctx.db
			.query('skills')
			.withIndex('by_owner_kind')
			.paginate({ cursor: null, numItems: 25 });
		return {
			isDone: result.isDone,
			continueCursor: result.continueCursor,
			page: result.page.map(({ _id, key, inputSchema }) => ({ _id, key, inputSchema })),
		};
	},
});
```

Follow every page by replacing `cursor` with the previous `continueCursor` until `isDone` is true. Keep the projected records in a private temporary JSONL file, outside the repository, and audit it with the proposed code:

```sh
bun scripts/audit-skill-schemas.ts --file /tmp/meseeks-skill-schemas.jsonl
```

The audit visits every supplied record and reports `current`, `ready`, and `blocked` counts plus the IDs/keys and reasons for blocked records. It does not print schema contents. Resolve every blocked record before rollout. Unsupported transforms, coercions and non-JSON constructs are reported, never replaced with permissive schemas. The checked-in compatibility fixtures establish library behavior; the targeted audit is still required for the real corpus. Recovery copies are created per record by the migration below.

## After deploying phase 1

Wait until every backend instance uses the phase-1 writers, then audit the live deployment. This script follows every page; a migration `dryRun` only checks one batch.

```sh
bun scripts/audit-skill-schemas.ts --prod
bun convex run migrations:_runSkillSchemaMigration '{"dryRun":true}' --prod
```

The app's dry run processes one indexed batch and intentionally throws `ConvexError` with only `kind: "DRY RUN"`, `processed`, and `isDone`, rolling back the transaction. This expected nonzero CLI result is success for the rehearsal; any other error is a failure. The component's built-in dry run is not used because it serializes BigInt-bearing documents with `JSON.stringify` and logs their full before/after contents. Once the full audit has zero blocked records and the dry run is satisfactory:

```sh
bun convex run migrations:_runSkillSchemaMigration '{}' --prod
```

The runner schedules batches of 25 records. Each record is re-read and patched in its transaction, preserving concurrent edits. The original string is copied to `legacyInputSchema` before conversion. Existing backups are preserved. Current records are validated and skipped. Re-running the same runner resumes unfinished work; it does not reapply finished records.

After the runner finishes, run the full audit again:

```sh
bun scripts/audit-skill-schemas.ts --prod
```

Completion requires `ready: 0` and `blocked: 0`, plus working skill creation/editing, Pro catalog imports, AI tool calls, and replay of queued actions with BigInt arguments. Repeat for every active environment. The new writers normalize imported legacy schemas, so catalog redeploys cannot reintroduce the old format.

If the completed runner's audit still finds legacy records, identify the remaining old writer first. After fixing it, restart the scan with `bun convex run migrations:_runSkillSchemaMigration '{"reset":true}' --prod`, then audit again. The per-record conversion is idempotent and preserves existing backups.

## Format and compatibility

- New JSON Schema documents declare `$schema` and carry `x-meseeks-schema-version: 1` after saving. Unmarked documents are treated as legacy Zodex, avoiding guesses about ambiguous object schemas.
- BigInt values use decimal strings at JSON boundaries, annotated with `x-codec: "bigint-decimal-v1"`. `x-bigint` stores exact decimal bounds/divisors. Runtime validation also accepts existing BigInts from Convex, without accepting imprecise numbers.
- `x-zod-strip` preserves stripping of unknown object properties. `x-zod-prefault` preserves legacy default validation; `x-zod-optional` preserves optional-before-default precedence. `x-zod-readonly` preserves readonly outputs. `x-zod-tuple-length` preserves the required input length of legacy tuples with optional elements.
- AI providers receive standard JSON Schema without application annotations. Validation and decoding remain local. The internal execution path uses the same AI SDK validator.
- Unsupported keywords, unknown codec/version identifiers, external references and overly complex schemas fail validation. A successful schema conversion is not evidence that arbitrary refinements or executable transforms can be serialized.
- Hybrid legacy documents may contain a JSON Schema `required` list. It is accepted only when it exactly matches the legacy properties' requiredness; contradictory lists remain blocked. The production audit found redundant lists, and an unpatched Zodex fixture verifies their behavior.
- The production audit also found a string `enum` that Zodex ignored. The owner explicitly approved enforcing those listed values while retaining the field's optionality. String enums now intersect with the other string constraints, and the original document is preserved in the migration backup. This is an intentional validation tightening, not a claim of identical behavior for that keyword.
- Five DEV documents had an empty root `{}`, which Zodex interpreted as `z.undefined()` and therefore rejected object arguments. The owner approved repairing empty roots as parameterless skills (`z.object({})`, with unknown properties stripped). Nested missing types remain blocked. This deliberately changes the invalid input contract and retains the original `{}` in `legacyInputSchema`.

## Recovery and phase 2

The phase-1 release is the rollback target: it understands both formats. Rolling application code back to the old Zodex-only release would break newly written schemas. Original migrated strings remain available in `legacyInputSchema`; restoring one must compare its current value first so a subsequent user edit is not lost.

Open phase 2 only after all environments have completed migration and verification. Remove the legacy converter, migration runner/audit code and legacy fixtures then. Decide the retention/export of recovery copies before removing `legacyInputSchema`. Tighten optional fields only where the migration has established their presence; this migration does not backfill unrelated optional fields.

import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { assertAppRoot } from './preview-env';
import { inspectSkillSchema } from '../lib/skillSchemaMigration';

const entrySchema = z.object({
	id: z.string(),
	key: z.string(),
	status: z.enum(['current', 'ready', 'blocked']),
	error: z.string().optional(),
});
const pageSchema = z.object({ page: z.array(entrySchema), isDone: z.boolean(), continueCursor: z.string() });

async function main() {
	//
	assertAppRoot();
	const args = process.argv.slice(2);
	const counts = { current: 0, ready: 0, blocked: 0 };
	const blocked: z.infer<typeof entrySchema>[] = [];
	function collect(entries: z.infer<typeof entrySchema>[]) {
		for (const entry of entries) {
			counts[entry.status]++;
			if (entry.status === 'blocked') blocked.push(entry);
		}
	}
	if (args[0] === '--file') {
		if (args.length !== 2)
			throw new Error('Usage: bun scripts/audit-skill-schemas.ts --file <skills/documents.jsonl>');
		const contents = await Bun.file(args[1]).text();
		for (const line of contents.split('\n')) {
			if (!line.trim()) continue;
			const skill = z
				.object({ _id: z.string(), key: z.string(), inputSchema: z.string() })
				.parse(JSON.parse(line));
			collect([{ id: skill._id, key: skill.key, ...inspectSkillSchema(skill.inputSchema) }]);
		}
	} else {
		// only deployment selectors are forwarded; audit must never push code or invoke a mutation.
		const selectors = z
			.union([
				z.tuple([]),
				z.tuple([z.literal('--prod')]),
				z.tuple([z.enum(['--deployment-name', '--preview-name']), z.string().min(1)]),
			])
			.parse(args);
		let cursor: string | null = null;
		for (;;) {
			const result = spawnSync(
				'bun',
				[
					'convex',
					'run',
					'migrations:_auditSkillSchemas',
					JSON.stringify({ paginationOpts: { numItems: 25, cursor } }),
					...selectors,
				],
				{ encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
			);
			if (result.error) throw result.error;
			if (result.status !== 0) throw new Error(result.stderr || 'Convex audit failed');
			const page = pageSchema.parse(JSON.parse(result.stdout));
			collect(page.page);
			if (page.isDone) break;
			if (page.continueCursor === cursor) throw new Error('Audit cursor did not advance');
			cursor = page.continueCursor;
		}
	}
	console.info(JSON.stringify({ counts, blocked }, null, 2));
	if (counts.blocked) process.exitCode = 1;
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});

import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Id } from 'convex/_generated/dataModel';
import type { StagedText } from 'schemas/reactorSchema';

export const executePreparationSchema = z.object({
	root: zid('files'),
	code: z.string().min(1).max(10_000),
	language: z
		.enum([
			'javascript', //
			'python',
		])
		.default('javascript'),
	timeoutSeconds: z.number().int().positive().optional(),
	warnings: z.array(z.string()).optional(),
});

export type ExecutePreparation = z.infer<typeof executePreparationSchema>;

export function prepareExecute(args: z.input<typeof executePreparationSchema>) {
	//
	return executePreparationSchema.parse(args);
}

export async function performExecute({
	action,
	stageText,
	warnings,
}: {
	action: { _id: Id<'actions'>; owner: Id<'users'> };
	preparation: ExecutePreparation;
	stageText(args: { owner: Id<'users'>; content: string; contentType: string }): Promise<StagedText>;
	warnings: Array<string>;
}) {
	//
	const output = await stageText({
		owner: action.owner,
		content: 'Execute is not wired to boxes in the current runtime.',
		contentType: 'text/mdx; charset=utf-8',
	});

	return {
		action: action._id,
		status: 'skipped' as const,
		output,
		warnings: warnings.concat('Execute is not wired to boxes in the current runtime.'),
	};
}

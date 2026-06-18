import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc } from 'convex/_generated/dataModel';
import type { MutationCtx } from 'convex/_generated/server';
import { getFileWriteContext } from '../files.private';
import { readText } from '../storage.private';
import { defineInstinct } from 'lib/instinct';

const preparationSchema = z.object({
	contentType: z.string().optional(),
	path: z.string(),
	storageKey: z.string().optional(),
});

export const writeInputSchema = z.object({
	fileId: z.string().min(1),
	content: z.string(),
	contentType: z.string().min(1).optional(),
	expectedRevisionId: z.string().min(1).optional(),
});

const outputSchema = z.object({
	summary: z.string().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
});

export async function prepareWrite(
	ctx: MutationCtx,
	{ action, input }: { action: Doc<'actions'>; input: z.infer<typeof writeInputSchema> },
) {
	//
	const file = zid('files').parse(input.fileId);
	const expectedRevision = input.expectedRevisionId
		? zid('file_revisions').parse(input.expectedRevisionId)
		: undefined;
	const context = await getFileWriteContext(ctx, {
		owner: action.owner,
		file,
		expectedRevision,
	});
	const now = Date.now();

	return {
		action: action._id,
		owner: action.owner,
		createdAt: now,
		kind: 'preparation' as const,
		skill: action.skill,
		skillKind: 'instinct' as const,
		preparedAt: now,
		context: {
			contentType: context.contentType,
			path: context.path,
			storageKey: context.storageKey,
		},
	};
}

export const write = defineInstinct({
	key: 'write',
	description: 'Write to a text file.',
	inputSchema: writeInputSchema,
	outputSchema,
	async perform({ action, input, preparation, warnings }, { stageText }) {
		//
		const parsedPreparation = preparationSchema.parse(preparation);
		const file = zid('files').parse(input.fileId);
		const expectedRevision = input.expectedRevisionId
			? zid('file_revisions').parse(input.expectedRevisionId)
			: undefined;
		const beforeContent = parsedPreparation.storageKey
			? await readText({ storageKey: parsedPreparation.storageKey })
			: '';
		const body = await stageText({
			owner: action.owner,
			content: input.content,
			contentType: input.contentType ?? parsedPreparation.contentType ?? 'text/plain; charset=utf-8',
		});
		const output = await stageText({
			owner: action.owner,
			content: `Wrote ${parsedPreparation.path}.`,
			contentType: 'text/mdx; charset=utf-8',
		});

		return {
			action: action._id,
			status: 'succeeded',
			output,
			fileMutations: [
				{
					kind: 'writeText',
					file,
					beforeContent,
					expectedRevision,
					body,
				},
			],
			warnings,
		};
	},
});

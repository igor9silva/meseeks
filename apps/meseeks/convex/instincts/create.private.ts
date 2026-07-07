import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineInstinct } from 'lib/instinct';

const inputSchema = z.object({
	kind: z.enum([
		'file', //
		'directory',
	]),
	parentId: z.string().min(1).optional(),
	name: z
		.string()
		.min(1)
		.regex(/^[^/\\]+$/, 'Name must not contain slashes.'),
	content: z.string().optional(),
	contentType: z.string().min(1).optional(),
});

const outputSchema = z.object({
	summary: z.string().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
});

export const create = defineInstinct({
	key: 'create',
	description: 'Create a file or directory.',
	inputSchema,
	outputSchema,
	async perform({ action, input, warnings }, { stageText }) {
		//
		const parent = input.parentId ? zid('files').parse(input.parentId) : action.root;
		const output = await stageText({
			owner: action.owner,
			content: input.kind === 'directory' ? `Created directory ${input.name}.` : `Created file ${input.name}.`,
			contentType: 'text/mdx; charset=utf-8',
		});

		if (input.kind === 'directory') {
			return {
				action: action._id,
				status: 'succeeded',
				output,
				fileMutations: [
					{
						kind: 'createDirectory',
						parent,
						name: input.name,
					},
				],
				warnings,
			};
		}

		const body = await stageText({
			owner: action.owner,
			content: input.content ?? '',
			contentType: input.contentType ?? 'text/plain; charset=utf-8',
		});

		return {
			action: action._id,
			status: 'succeeded',
			output,
			fileMutations: [
				{
					kind: 'createText',
					parent,
					name: input.name,
					body,
				},
			],
			warnings,
		};
	},
});

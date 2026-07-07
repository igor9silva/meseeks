import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc } from 'convex/_generated/dataModel';
import type { MutationCtx } from 'convex/_generated/server';
import { defineInstinct } from 'lib/instinct';
import { createStagedStorageKey, createUploadUrl } from '../storage.private';
import { ensureDirectoryOwner } from '../files.private';

export const prepareUploadInputSchema = z.object({
	parentId: z.string().min(1).optional(),
	name: z.string().min(1),
	contentType: z.string().min(1),
	size: z.number().int().min(0),
	hash: z.string().regex(/^[a-f0-9]{64}$/),
	checksum: z.string().min(1),
});

const outputSchema = z.object({
	summary: z.string().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
});

const preparationSchema = z.object({
	parent: zid('files'),
	name: z.string().min(1),
	contentType: z.string().min(1),
	size: z.number().int().min(0),
	hash: z.string().min(1),
	checksum: z.string().min(1),
});

export async function prepareUpload(
	ctx: MutationCtx,
	{ action, input }: { action: Doc<'actions'>; input: z.infer<typeof prepareUploadInputSchema> },
) {
	//
	const parent = input.parentId ? zid('files').parse(input.parentId) : action.root;
	await ensureDirectoryOwner(ctx, {
		owner: action.owner,
		directory: parent,
	});

	return {
		action: action._id,
		owner: action.owner,
		createdAt: Date.now(),
		kind: 'preparation',
		skill: action.skill,
		skillKind: 'instinct',
		preparedAt: Date.now(),
		context: {
			parent,
			name: input.name,
			contentType: input.contentType,
			size: input.size,
			hash: input.hash,
			checksum: input.checksum,
		},
	};
}

export const prepareUploadInstinct = defineInstinct({
	key: 'prepareUpload',
	description: 'Prepare a direct Object Storage upload ticket.',
	inputSchema: prepareUploadInputSchema,
	outputSchema,
	async perform({ action, preparation, warnings }, { stageText }) {
		//
		const ticket = preparationSchema.parse(preparation);
		const stagedStorageKey = createStagedStorageKey({ owner: action.owner });
		const signed = await createUploadUrl({
			storageKey: stagedStorageKey,
			contentType: ticket.contentType,
			checksum: ticket.checksum,
		});
		const output = await stageText({
			owner: action.owner,
			content: `Prepared upload ticket for ${ticket.name}.`,
			contentType: 'text/mdx; charset=utf-8',
		});

		return {
			action: action._id,
			status: 'succeeded',
			output,
			uploadTicket: {
				ticketAction: action._id,
				parent: ticket.parent,
				name: ticket.name,
				contentType: ticket.contentType,
				size: ticket.size,
				hash: ticket.hash,
				checksum: ticket.checksum,
				stagedStorageKey,
				uploadUrl: signed.uploadUrl,
				expiresAt: signed.expiresAt,
			},
			warnings,
		};
	},
});

import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc } from 'convex/_generated/dataModel';
import type { MutationCtx } from 'convex/_generated/server';
import { defineInstinct } from 'lib/instinct';
import { findUploadTicket } from '../action/details.private';
import { findAction } from '../actions.private';
import { copyBody, createCanonicalStorageKey, findBody } from '../storage.private';

export const commitUploadInputSchema = z.object({
	ticketActionId: z.string().min(1),
});

const outputSchema = z.object({
	summary: z.string().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
});

const preparationSchema = z.object({
	ticketAction: zid('actions'),
	parent: zid('files'),
	name: z.string().min(1),
	contentType: z.string().min(1),
	size: z.number().int().min(0),
	hash: z.string().min(1),
	checksum: z.string().min(1),
	stagedStorageKey: z.string().min(1),
});

export async function prepareCommitUpload(
	ctx: MutationCtx,
	{ action, input }: { action: Doc<'actions'>; input: z.infer<typeof commitUploadInputSchema> },
) {
	//
	const ticketActionId = zid('actions').parse(input.ticketActionId);
	const ticketAction = await findAction(ctx, { action: ticketActionId });
	if (ticketAction.owner !== action.owner) throw new Error('Upload ticket belongs to a different user.');
	if (ticketAction.skill !== 'prepareUpload') throw new Error('Upload ticket action is not a prepareUpload action.');
	if (ticketAction.status !== 'succeeded') throw new Error('Upload ticket action has not succeeded.');

	const ticket = await findUploadTicket(ctx, { action: ticketActionId });
	const now = Date.now();

	return {
		action: action._id,
		owner: action.owner,
		createdAt: now,
		kind: 'preparation',
		skill: action.skill,
		skillKind: 'instinct',
		preparedAt: now,
		context: {
			ticketAction: ticket.ticketAction,
			parent: ticket.parent,
			name: ticket.name,
			contentType: ticket.contentType,
			size: ticket.size,
			hash: ticket.hash,
			checksum: ticket.checksum,
			stagedStorageKey: ticket.stagedStorageKey,
		},
	};
}

export const commitUpload = defineInstinct({
	key: 'commitUpload',
	description: 'Commit a prepared Object Storage upload into the file tree.',
	inputSchema: commitUploadInputSchema,
	outputSchema,
	async perform({ action, preparation, warnings }, { stageText }) {
		//
		const ticket = preparationSchema.parse(preparation);
		const staged = await findBody({ storageKey: ticket.stagedStorageKey });
		if (staged.contentLength !== ticket.size) {
			throw new Error(
				`Uploaded object size mismatch: expected ${ticket.size}, found ${staged.contentLength ?? 'unknown'}.`,
			);
		}
		if (staged.checksum && staged.checksum !== ticket.checksum) {
			throw new Error('Uploaded object checksum mismatch.');
		}

		const storageKey = createCanonicalStorageKey({ owner: action.owner });
		await copyBody({
			from: ticket.stagedStorageKey,
			to: storageKey,
			contentType: ticket.contentType,
		});

		const output = await stageText({
			owner: action.owner,
			content: `Committed upload ${ticket.name}.`,
			contentType: 'text/mdx; charset=utf-8',
		});

		return {
			action: action._id,
			status: 'succeeded',
			output,
			fileMutations: [
				{
					kind: 'createFile',
					parent: ticket.parent,
					name: ticket.name,
					body: {
						contentType: ticket.contentType,
						hash: ticket.hash,
						size: ticket.size,
						storageKey,
					},
				},
			],
			warnings,
		};
	},
});

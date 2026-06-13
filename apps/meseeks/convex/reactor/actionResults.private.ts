'use node';

import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { deleteBodiesBestEffort, storeBody } from './storage.private';

export const writeResultFile = async (
	ctx: ActionCtx,
	{
		owner,
		directory,
		action,
		name,
		content,
		contentType,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		action: Id<'actions'>;
		name: string;
		content: string;
		contentType: string;
	},
) => {
	const storageKey = await storeBody({
		owner,
		actionId: action,
		content,
		contentType,
	});
	const file = await ctx
		.runMutation(internal.files._writeActionResultFile, {
			owner,
			directory,
			action,
			name,
			content,
			storageKey,
			contentType,
		})
		.catch(async (error: unknown) => {
			await deleteBodiesBestEffort([storageKey]);
			throw error;
		});
	await deleteBodiesBestEffort([file.previousStorageKey]);
	return file;
};

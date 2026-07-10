import { zid } from 'convex-helpers/server/zod3';
import { internalMutation, internalQuery } from 'lib/convex';
import { authorSchema } from 'schemas/authorSchema';
import { objectContentPointerSchema } from 'schemas/fileSchema';
import { catFile, ensureFileOwner, setObjectContentPointer } from './files.private';

export const _readContext = internalQuery({
	args: {
		owner: zid('users'),
		fileId: zid('files'),
	},
	handler: async (ctx, { owner, fileId }) => {
		//
		const file = await ensureFileOwner(ctx, { fileId, owner });
		if (!file.currentContent) {
			return {
				source: 'empty',
				text: '',
			};
		}

		if (file.currentContent.kind === 'text') {
			return {
				source: 'text',
				text: await catFile(ctx, { fileId, owner }),
			};
		}

		return {
			source: 'object',
			object: file.currentContent,
		};
	},
});

export const _setObjectPointer = internalMutation({
	args: {
		owner: zid('users'),
		fileId: zid('files'),
		author: authorSchema,
		pointer: objectContentPointerSchema,
	},
	handler: async (ctx, args) => {
		//
		await setObjectContentPointer(ctx, args);
	},
});

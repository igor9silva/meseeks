import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { action } from 'lib/convex';
import { Unauthorized } from 'lib/errors';
import type { ContentPointer, ObjectReadRange } from 'lib/reactor/adapters';
import { env } from 'schemas/envSchema';
import { contentPointerSchema } from 'schemas/fileSchema';
import { internal } from './_generated/api';
import type { ActionCtx } from './_generated/server';
import { createConfiguredObjectStorageAdapter } from './objectStorage.private';

const objectReadPointerSchema = z.object({
	kind: z.literal('object'),
	storageKey: z.string().min(1),
	size: z.number().int().nonnegative(),
	contentType: z.string().min(1).optional(),
});

const contentReadContextSchema = z.discriminatedUnion('source', [
	z.object({
		source: z.literal('empty'),
		text: z.string(),
	}),
	z.object({
		source: z.literal('text'),
		text: z.string(),
	}),
	z.object({
		source: z.literal('object'),
		object: objectReadPointerSchema,
	}),
]);

const contentReadResultSchema = z.object({
	source: z.enum(['empty', 'text', 'object']),
	text: z.string(),
	isTruncated: z.boolean(),
	pointer: objectReadPointerSchema.optional(),
	limitBytes: z.number().int().positive().optional(),
});

const objectWriteResultSchema = z.object({
	pointer: objectReadPointerSchema,
});

type ContentReadContext = z.infer<typeof contentReadContextSchema>;
type ContentReadResult = z.infer<typeof contentReadResultSchema>;
type ObjectWriteResult = z.infer<typeof objectWriteResultSchema>;
type ReadMode = 'cat' | 'head' | 'tail';

async function currentActionUser(ctx: ActionCtx) {
	//
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw Unauthorized();

	const parsedAppUserId = zid('users').safeParse(identity.userId);
	return await ctx.runQuery(internal.users._findCurrentByIdentity, {
		authUserId: identity.subject,
		appUserId: parsedAppUserId.success ? parsedAppUserId.data : undefined,
	});
}

export const cat = action({
	args: {
		fileId: zid('files'),
		maxBytes: z.number().int().positive().max(8_388_608).default(env.MAX_REACTOR_OBJECT_READ_BYTES),
	},
	handler: async (ctx, { fileId, maxBytes }): Promise<ContentReadResult> => {
		//
		const currentUser = await currentActionUser(ctx);
		const context = contentReadContextSchema.parse(
			await ctx.runQuery(internal.fileContent._readContext, {
				owner: currentUser._id,
				fileId,
			}),
		);

		return await renderContentRead({
			context,
			mode: 'cat',
			maxBytes,
		});
	},
});

export const head = action({
	args: {
		fileId: zid('files'),
		lines: z.number().int().positive().max(500).default(40),
		maxBytes: z.number().int().positive().max(1_048_576).default(env.MAX_REACTOR_PARTIAL_READ_BYTES),
	},
	handler: async (ctx, { fileId, lines, maxBytes }): Promise<ContentReadResult> => {
		//
		const currentUser = await currentActionUser(ctx);
		const context = contentReadContextSchema.parse(
			await ctx.runQuery(internal.fileContent._readContext, {
				owner: currentUser._id,
				fileId,
			}),
		);

		return await renderContentRead({
			context,
			mode: 'head',
			lines,
			maxBytes,
		});
	},
});

export const tail = action({
	args: {
		fileId: zid('files'),
		lines: z.number().int().positive().max(500).default(40),
		maxBytes: z.number().int().positive().max(1_048_576).default(env.MAX_REACTOR_PARTIAL_READ_BYTES),
	},
	handler: async (ctx, { fileId, lines, maxBytes }): Promise<ContentReadResult> => {
		//
		const currentUser = await currentActionUser(ctx);
		const context = contentReadContextSchema.parse(
			await ctx.runQuery(internal.fileContent._readContext, {
				owner: currentUser._id,
				fileId,
			}),
		);

		return await renderContentRead({
			context,
			mode: 'tail',
			lines,
			maxBytes,
		});
	},
});

export const writeObject = action({
	args: {
		fileId: zid('files'),
		content: z.string(),
		contentType: z.string().min(1).default('text/plain'),
	},
	handler: async (ctx, { fileId, content, contentType }): Promise<ObjectWriteResult> => {
		//
		const currentUser = await currentActionUser(ctx);
		const adapter = createConfiguredObjectStorageAdapter();
		const write = await adapter.write({
			bytes: new TextEncoder().encode(content),
			contentType,
		});
		const pointer = objectReadPointerSchema.parse({
			kind: 'object',
			storageKey: write.key,
			size: write.size,
			contentType: write.contentType,
		});

		await ctx.runMutation(internal.fileContent._setObjectPointer, {
			owner: currentUser._id,
			fileId,
			author: currentUser._id,
			pointer,
		});

		return {
			pointer,
		};
	},
});

async function renderContentRead(args: {
	context: ContentReadContext;
	mode: ReadMode;
	lines?: number;
	maxBytes: number;
}): Promise<ContentReadResult> {
	//
	if (args.context.source === 'empty') {
		return {
			source: args.context.source,
			text: '',
			isTruncated: false,
		};
	}

	if (args.context.source === 'text') {
		return {
			source: args.context.source,
			text: sliceLines({
				text: args.context.text,
				mode: args.mode,
				lines: args.lines,
			}),
			isTruncated: false,
		};
	}

	const pointer = contentPointerSchema.parse({
		kind: 'object',
		storageKey: args.context.object.storageKey,
		size: args.context.object.size,
		contentType: args.context.object.contentType,
	});
	if (pointer.kind !== 'object') throw new Error('Expected object content pointer.');

	if (args.mode === 'cat' && pointer.size > args.maxBytes) {
		return {
			source: args.context.source,
			text: '',
			isTruncated: true,
			pointer: args.context.object,
			limitBytes: args.maxBytes,
		};
	}

	const bytes = await readObjectBytes({
		pointer,
		mode: args.mode,
		maxBytes: args.maxBytes,
	});
	const text = new TextDecoder().decode(bytes);
	const isTruncated = args.mode !== 'cat' && pointer.size > args.maxBytes;

	return {
		source: args.context.source,
		text: sliceLines({
			text,
			mode: args.mode,
			lines: args.lines,
		}),
		isTruncated,
		pointer: args.context.object,
		limitBytes: args.maxBytes,
	};
}

async function readObjectBytes(args: {
	pointer: Extract<ContentPointer, { kind: 'object' }>;
	mode: ReadMode;
	maxBytes: number;
}) {
	//
	if (args.pointer.size === 0) return new Uint8Array();

	const adapter = createConfiguredObjectStorageAdapter();
	if (args.mode === 'cat') return await adapter.read(args.pointer);

	const readBytes = Math.min(args.pointer.size, args.maxBytes);
	let range: ObjectReadRange;
	if (args.mode === 'head') {
		range = {
			offset: 0,
			length: readBytes,
		};
	} else {
		range = {
			suffixLength: readBytes,
		};
	}

	const readRange = adapter.readRange;
	if (readRange) return await readRange(args.pointer, range);

	if (args.pointer.size > args.maxBytes) {
		throw new Error('Object storage adapter does not support bounded range reads.');
	}

	return await adapter.read(args.pointer);
}

function sliceLines(args: { text: string; mode: ReadMode; lines?: number }) {
	//
	if (args.mode === 'cat') return args.text;

	const lines = args.lines ?? 40;
	const parts = args.text.split('\n');
	if (args.mode === 'head') return parts.slice(0, lines).join('\n');

	return parts.slice(-lines).join('\n');
}

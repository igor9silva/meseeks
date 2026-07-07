import { z } from 'zod/v3';

const revisionPatchSchema = z.object({
	kind: z.string().optional(),
	before: z
		.object({
			content: z.string().optional(),
			contentType: z.string().optional(),
		})
		.optional(),
	after: z
		.object({
			content: z.string().optional(),
			contentType: z.string().optional(),
		})
		.optional(),
});

export type RevisionContent = {
	before?: string;
	beforeContentType?: string;
	after?: string;
	afterContentType?: string;
};

export function contentPairFromPatch(patch: string | undefined): RevisionContent {
	//
	if (!patch) return {};

	try {
		const parsed = revisionPatchSchema.safeParse(JSON.parse(patch));
		if (!parsed.success) return {};

		return {
			before: parsed.data.before?.content,
			beforeContentType: parsed.data.before?.contentType,
			after: parsed.data.after?.content,
			afterContentType: parsed.data.after?.contentType,
		};
	} catch {
		return {};
	}
}

export function contentFromPatch(patch: string | undefined) {
	//
	const content = contentPairFromPatch(patch);

	return content.after ?? content.before;
}

export function contentTypeFromPatch(patch: string | undefined) {
	//
	const content = contentPairFromPatch(patch);

	return content.afterContentType ?? content.beforeContentType;
}

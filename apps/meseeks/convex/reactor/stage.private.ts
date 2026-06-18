import type { Id } from 'convex/_generated/dataModel';
import type { PerformResult, StagedText } from 'schemas/reactorSchema';
import { deleteBody, storeText } from '../storage.private';

export async function stageText({
	owner,
	content,
	contentType,
}: {
	owner: Id<'users'>;
	content: string;
	contentType: string;
}): Promise<StagedText> {
	//
	const stored = await storeText({
		owner,
		content,
		contentType,
	});

	return {
		...stored,
		content,
		contentType,
	};
}

export async function cleanupStaged(result: PerformResult) {
	//
	const storageKeys: Array<string> = [];
	if (result.output) storageKeys.push(result.output.storageKey);

	for (const mutation of result.fileMutations ?? []) {
		if (mutation.kind === 'createFile') storageKeys.push(mutation.body.storageKey);
		if (mutation.kind === 'createText' || mutation.kind === 'writeText') storageKeys.push(mutation.body.storageKey);
		if (mutation.kind === 'createTextAtPath') storageKeys.push(mutation.body.storageKey);
	}

	for (const storageKey of storageKeys) {
		await deleteBody({ storageKey });
	}
}

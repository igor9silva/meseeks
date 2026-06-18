import { instinctSchema } from 'schemas/skillSchema';
import { zodToString } from 'lib/zodToString';
import { commitUpload } from './commitUpload.private';
import { compile } from './compile.private';
import { create } from './create.private';
import { createTrigger } from './createTrigger.private';
import { disableTrigger } from './disableTrigger.private';
import { execute } from './execute.private';
import { interrupt } from './interrupt.private';
import { move } from './move.private';
import { prepareUploadInstinct } from './prepareUpload.private';
import { request } from './request.private';
import { say } from './say.private';
import { seed } from './seed.private';
import { tag } from './tag.private';
import { think } from './think.private';
import { untag } from './untag.private';
import { write } from './write.private';

export const instincts = {
	say,
	think,
	request,
	execute,
	create,
	write,
	move,
	tag,
	untag,
	interrupt,
	seed,
	prepareUpload: prepareUploadInstinct,
	commitUpload,
	createTrigger,
	disableTrigger,
	compile,
};

export type InstinctKey = keyof typeof instincts;

export function isInstinctKey(key: string): key is InstinctKey {
	//
	return key in instincts;
}

export function findInstinct(key: string) {
	//
	if (!isInstinctKey(key)) return undefined;

	return instincts[key];
}

export function listInstincts() {
	//
	return Object.values(instincts).map((instinct) =>
		instinctSchema.parse({
			key: instinct.key,
			kind: instinct.key,
			description: instinct.description,
			inputSchema: zodToString(instinct.inputSchema),
			outputSchema: zodToString(instinct.outputSchema),
		}),
	);
}

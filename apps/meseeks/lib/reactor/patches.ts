import { createTwoFilesPatch } from 'diff';

export function createFilePatch(name: string, tags: Array<{ key: string; value: string }>) {
	//
	const lines = [`+ file ${name}`];

	for (const tag of tags) {
		lines.push(`+ tag ${tag.key}=${tag.value}`);
	}

	return lines.join('\n');
}

export function updateContentPatch(path: string, oldText: string, newText: string) {
	//
	if (oldText === newText) return '';

	return createTwoFilesPatch(path, path, oldText, newText, undefined, undefined, {
		context: 3,
		stripTrailingCr: true,
	});
}

export function movePatch(input: { oldPath: string; newPath: string }) {
	//
	return `rename ${input.oldPath} -> ${input.newPath}`;
}

export function tagPatch(input: { key: string; oldValue?: string; newValue?: string }) {
	//
	if (input.oldValue === undefined && input.newValue !== undefined) return `+ tag ${input.key}=${input.newValue}`;
	if (input.oldValue !== undefined && input.newValue === undefined) return `- tag ${input.key}=${input.oldValue}`;
	if (input.oldValue !== undefined && input.newValue !== undefined) {
		return `~ tag ${input.key}=${input.oldValue} -> ${input.key}=${input.newValue}`;
	}
	return '';
}

import { z } from 'zod/v3';
import { skillInputArgumentSchema } from 'schemas/skillSchema';

const instinctSkillSchema = z.object({
	key: z.string().min(1),
	name: z.string().min(1),
	description: z.string().min(1),
	input: z.array(skillInputArgumentSchema).default([]),
	body: z.string().default(''),
});

export type InstinctSkill = z.infer<typeof instinctSkillSchema>;

export const instinctSkills = [
	instinctSkillSchema.parse({
		key: 'say',
		name: 'Say',
		description: 'Records a human message on a file.',
		input: [
			{
				key: 'message',
				type: 'string',
				required: true,
				description: 'Human message text to append to the file action ledger.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'think',
		name: 'Think',
		description: 'Runs intelligence over the current file context and returns a reply.',
		input: [
			{
				key: 'mode',
				type: 'string',
				required: false,
				description: 'Optional thinking mode, such as reply.',
			},
		],
		body: [
			'You are PRO acting inside a user-owned file.',
			'Answer the user directly from the visible file context and recent action history.',
			'When the user asks for changes, prefer concrete file mutations through follow-up skills instead of pretending work happened.',
		].join('\n'),
	}),
	instinctSkillSchema.parse({
		key: 'execute',
		name: 'Execute',
		description: 'Runs code in an isolated sandbox with declared inputs and outputs.',
		input: [
			{
				key: 'code',
				type: 'string',
				required: true,
				description: 'JavaScript or Python code to run through the sandbox.',
			},
			{
				key: 'language',
				type: 'string',
				required: false,
				description: 'Code language: javascript or python. Defaults to javascript.',
			},
			{
				key: 'outputs',
				type: 'json',
				required: false,
				description: 'Declared output paths to sync back after execution.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'createFile',
		name: 'Create File',
		description: 'Creates a file in the VFS.',
		input: [
			{
				key: 'parent',
				type: 'file',
				required: false,
				description: 'Parent file id. Omit for a root-level file.',
			},
			{
				key: 'name',
				type: 'string',
				required: true,
				description: 'New file name, unique within the parent.',
			},
			{
				key: 'content',
				type: 'string',
				required: false,
				description: 'Optional initial text content.',
			},
			{
				key: 'tags',
				type: 'json',
				required: false,
				description: 'Optional string key/value tags.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'write',
		name: 'Write',
		description: 'Writes content to a VFS file.',
		input: [
			{
				key: 'content',
				type: 'string',
				required: true,
				description: 'Replacement file text content.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'updateFileMetadata',
		name: 'Update File Metadata',
		description: 'Updates file metadata and tags.',
		input: [
			{
				key: 'name',
				type: 'string',
				required: false,
				description: 'Optional replacement file name.',
			},
			{
				key: 'tags',
				type: 'json',
				required: false,
				description: 'Optional tag updates.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'tag',
		name: 'Tag',
		description: 'Adds, updates, or removes VFS tags.',
		input: [
			{
				key: 'key',
				type: 'string',
				required: true,
				description: 'Tag key.',
			},
			{
				key: 'value',
				type: 'string',
				required: false,
				description: 'Tag value. Omit to remove the tag.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'move',
		name: 'Move',
		description: 'Moves a file to another parent.',
		input: [
			{
				key: 'parent',
				type: 'file',
				required: true,
				description: 'Destination parent file id.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'rename',
		name: 'Rename',
		description: 'Renames a file without changing its id.',
		input: [
			{
				key: 'name',
				type: 'string',
				required: true,
				description: 'Replacement name.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'changeEnergy',
		name: 'Change Energy',
		description: 'Changes a file budget by a signed amount.',
		input: [
			{
				key: 'amount',
				type: 'bigint',
				required: true,
				description: 'Signed USD energy amount in money precision units.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'stop',
		name: 'Stop',
		description: 'Interrupts older reaction work on the current file.',
		input: [],
	}),
	instinctSkillSchema.parse({
		key: 'createLoop',
		name: 'Create Loop',
		description: 'Creates a loop registration.',
		input: [
			{
				key: 'key',
				type: 'string',
				required: true,
				description: 'Loop key.',
			},
			{
				key: 'name',
				type: 'string',
				required: true,
				description: 'Loop display name.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'createTrigger',
		name: 'Create Trigger',
		description: 'Creates a lightweight trigger handler registration.',
		input: [
			{
				key: 'kind',
				type: 'string',
				required: true,
				description: 'Trigger kind: file or loop.',
			},
			{
				key: 'handler',
				type: 'file',
				required: true,
				description: 'VFS handler file id.',
			},
			{
				key: 'maxUses',
				type: 'integer',
				required: false,
				description: 'Maximum accepted firings before exhaustion.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'updateTrigger',
		name: 'Update Trigger',
		description: 'Updates a trigger registration.',
		input: [
			{
				key: 'trigger',
				type: 'json',
				required: true,
				description: 'Trigger id or update descriptor.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'createRoute',
		name: 'Create Route',
		description: 'Maps a slug to a component file.',
		input: [
			{
				key: 'slug',
				type: 'string',
				required: true,
				description: 'Route slug.',
			},
			{
				key: 'file',
				type: 'file',
				required: true,
				description: 'Component file id.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'claimEndpoint',
		name: 'Claim Endpoint',
		description: 'Claims an opaque webhook endpoint for a file and handler.',
		input: [
			{
				key: 'file',
				type: 'file',
				required: false,
				description: 'File receiving endpoint actions. Defaults to the current file.',
			},
			{
				key: 'handler',
				type: 'file',
				required: true,
				description: 'VFS handler file evaluated through the trigger isolate.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'unclaimEndpoint',
		name: 'Unclaim Endpoint',
		description: 'Disables a claimed endpoint and removes its trigger registration.',
		input: [
			{
				key: 'endpointId',
				type: 'json',
				required: true,
				description: 'Endpoint id to disable.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'listEndpoints',
		name: 'List Endpoints',
		description: 'Lists claimed endpoints for the current user.',
		input: [
			{
				key: 'file',
				type: 'file',
				required: false,
				description: 'Optional file id to filter endpoints.',
			},
		],
	}),
];

export function referenceInstinctSkill(key: string) {
	//
	return instinctSkills.find((skill) => skill.key === key);
}

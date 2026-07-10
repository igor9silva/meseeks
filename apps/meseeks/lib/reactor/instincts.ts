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
		description: 'Runs an approved command in an isolated sandbox.',
		input: [
			{
				key: 'command',
				type: 'string',
				required: true,
				description: 'Command to run through the sandbox.',
			},
			{
				key: 'timeoutMs',
				type: 'integer',
				required: false,
				description: 'Optional execution timeout in milliseconds.',
			},
			{
				key: 'env',
				type: 'json',
				required: false,
				description: 'Non-secret environment variables.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'request',
		name: 'Request',
		description: 'Performs an HTTP request through the trusted request path.',
		input: [
			{
				key: 'url',
				type: 'string',
				required: true,
				description: 'Request URL.',
			},
			{
				key: 'method',
				type: 'string',
				required: false,
				description: 'Request method.',
			},
			{
				key: 'headers',
				type: 'json',
				required: false,
				description: 'Typed literal or environment-reference headers.',
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
		description: 'Adds or updates VFS tags.',
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
				required: true,
				description: 'Tag value.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'untag',
		name: 'Untag',
		description: 'Removes a VFS tag.',
		input: [
			{
				key: 'key',
				type: 'string',
				required: true,
				description: 'Tag key.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'move',
		name: 'Move',
		description: 'Moves or renames a file without changing its id.',
		input: [
			{
				key: 'parent',
				type: 'file',
				required: false,
				description: 'Destination parent file id.',
			},
			{
				key: 'name',
				type: 'string',
				required: false,
				description: 'Replacement name.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'copyFile',
		name: 'Copy File',
		description: 'Copies any visible file into the current user space.',
		input: [
			{
				key: 'source',
				type: 'file',
				required: true,
				description: 'Visible source file id.',
			},
			{
				key: 'parent',
				type: 'file',
				required: false,
				description: 'Destination parent file id.',
			},
			{
				key: 'name',
				type: 'string',
				required: true,
				description: 'New copied file name.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'deleteFile',
		name: 'Delete File',
		description: 'Deletes a user-owned file.',
		input: [
			{
				key: 'file',
				type: 'file',
				required: true,
				description: 'File id to delete.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'updateBudget',
		name: 'Update Budget',
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
		key: 'render',
		name: 'Render',
		description: 'Renders a file for a human or intelligence context.',
		input: [
			{
				key: 'file',
				type: 'file',
				required: false,
				description: 'File id. Defaults to the current file.',
			},
		],
	}),
	instinctSkillSchema.parse({
		key: 'interrupt',
		name: 'Interrupt',
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
];

export function referenceInstinctSkill(key: string) {
	//
	return instinctSkills.find((skill) => skill.key === key);
}

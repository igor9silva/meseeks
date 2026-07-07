import { z } from 'zod/v3';
import { newActionSchema } from 'schemas/actionSchema';
import { fileRevisionChangeKindSchema } from 'schemas/fileRevisionSchema';
import { defineInstinct } from 'lib/instinct';

const inputSchema = z.object({
	events: z.array(fileRevisionChangeKindSchema).min(1),
	pattern: z.string().optional(),
	reactions: z.array(newActionSchema).min(1).max(5),
});

const outputSchema = z.object({
	summary: z.string().optional(),
});

export const createTrigger = defineInstinct({
	key: 'createTrigger',
	description: 'Create a mutation trigger source file for the current root.',
	inputSchema,
	outputSchema,
	async perform({ action, input, warnings }, { stageText }) {
		//
		const reaction = input.reactions[0];
		if (!reaction) throw new Error('Trigger source requires a reaction.');
		const path = ['.pro', 'triggers', `trigger-${String(action.index).padStart(6, '0')}.ts`];
		const nextWarnings = warnings.concat(triggerSourceWarnings(input));
		const source = await stageText({
			owner: action.owner,
			content: triggerSource({
				events: input.events,
				pattern: input.pattern,
				reaction,
			}),
			contentType: 'text/typescript; charset=utf-8',
		});
		const output = await stageText({
			owner: action.owner,
			content: [
				'# Create trigger',
				'',
				`- created \`/${path.join('/')}\``,
				'- trigger rows are derived by `compile`',
			].join('\n'),
			contentType: 'text/mdx; charset=utf-8',
		});

		return {
			action: action._id,
			status: 'succeeded',
			output,
			fileMutations: [
				{
					kind: 'createTextAtPath',
					parent: action.root,
					path,
					body: source,
				},
			],
			warnings: nextWarnings,
		};
	},
});

function triggerSource({
	events,
	pattern,
	reaction,
}: {
	events: Array<string>;
	pattern?: string;
	reaction: z.infer<typeof newActionSchema>;
}) {
	//
	const lines = [
		'export default defineTrigger({',
		`\tevents: [${events.map((event) => JSON.stringify(event)).join(', ')}],`,
	];

	if (pattern) lines.push(`\tpattern: ${JSON.stringify(pattern)},`);

	lines.push(`\tskill: ${JSON.stringify(reaction.skill)},`);
	if (typeof reaction.input.message === 'string') lines.push(`\tmessage: ${JSON.stringify(reaction.input.message)},`);
	lines.push('\tmaxUses: Infinity,', '});', '');

	return lines.join('\n');
}

function triggerSourceWarnings({ reactions }: z.infer<typeof inputSchema>) {
	//
	const warnings: Array<string> = [];
	if (reactions.length > 1) warnings.push('Only the first reaction was written to trigger source.');
	const reaction = reactions[0];
	if (reaction && reaction.skill !== 'compile' && typeof reaction.input.message !== 'string') {
		warnings.push('Only message input is supported by trigger source compilation right now.');
	}

	return warnings;
}

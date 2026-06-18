import { z } from 'zod/v3';
import { defineInstinct } from 'lib/instinct';

const inputSchema = z.object({});

const outputSchema = z.object({
	summary: z.string().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
});

const rootPage = `export default function Page() {
	return <main>PRO</main>;
}
`;

const rootCss = `:root {
	color-scheme: light dark;
}
`;

const settings = `{
	"version": 1
}
`;

const compileTrigger = `export default defineTrigger({
	description: 'Compile runtime projections when runtime source files change.',
	events: ['create', 'update', 'rename', 'delete'],
	patterns: [
		'*page.tsx',
		'*page.css',
		'/.pro/settings.json',
		'/.pro/skills/*.ts',
		'/.pro/triggers/*.ts',
		'/.pro/components/*.tsx',
	],
	skill: 'compile',
	maxUses: Infinity,
});
`;

const exampleRequestSkill = `export default defineSkill({
	kind: 'request',
	description: 'Fetch Example Domain as a safe request smoke test.',
	url: 'https://example.com',
	method: 'GET',
});
`;

const summarizeSkill = `export default defineSkill({
	kind: 'think',
	description: 'Summarize provided text or the current directory context.',
	instructions: 'Write a concise summary with the important facts and open questions.',
	model: 'auto',
	temperature: 0.3,
});
`;

const reflectSkill = `export default defineSkill({
	kind: 'think',
	description: 'Reflect on recent work and identify the next useful step.',
	instructions: 'Review the provided context, name the main decision, and suggest one concrete next action.',
	model: 'auto',
	temperature: 0.5,
});
`;

export const seed = defineInstinct({
	key: 'seed',
	description: 'Seed the initial runtime files for a new root directory.',
	inputSchema,
	outputSchema,
	async perform({ action, warnings }, { stageText }) {
		//
		const page = await stageText({
			owner: action.owner,
			content: rootPage,
			contentType: 'text/tsx; charset=utf-8',
		});
		const css = await stageText({
			owner: action.owner,
			content: rootCss,
			contentType: 'text/css; charset=utf-8',
		});
		const settingsSource = await stageText({
			owner: action.owner,
			content: settings,
			contentType: 'application/json; charset=utf-8',
		});
		const compileTriggerSource = await stageText({
			owner: action.owner,
			content: compileTrigger,
			contentType: 'text/typescript; charset=utf-8',
		});
		const exampleRequest = await stageText({
			owner: action.owner,
			content: exampleRequestSkill,
			contentType: 'text/typescript; charset=utf-8',
		});
		const summarize = await stageText({
			owner: action.owner,
			content: summarizeSkill,
			contentType: 'text/typescript; charset=utf-8',
		});
		const reflect = await stageText({
			owner: action.owner,
			content: reflectSkill,
			contentType: 'text/typescript; charset=utf-8',
		});
		const output = await stageText({
			owner: action.owner,
			content: [
				'# Seed',
				'',
				'- created `/page.tsx`',
				'- created `/page.css`',
				'- created `/.pro/settings.json`',
				'- created `/.pro/triggers/compile-on-runtime-source-change.ts`',
				'- created `/.pro/skills/example-request.ts`',
				'- created `/.pro/skills/summarize.ts`',
				'- created `/.pro/skills/reflect.ts`',
				'- queued `compile`',
			].join('\n'),
			contentType: 'text/mdx; charset=utf-8',
		});

		return {
			action: action._id,
			status: 'succeeded',
			output,
			fileMutations: [
				{
					kind: 'createText',
					parent: action.root,
					name: 'page.tsx',
					body: page,
				},
				{
					kind: 'createText',
					parent: action.root,
					name: 'page.css',
					body: css,
				},
				{
					kind: 'createTextAtPath',
					parent: action.root,
					path: ['.pro', 'settings.json'],
					body: settingsSource,
				},
				{
					kind: 'createTextAtPath',
					parent: action.root,
					path: ['.pro', 'triggers', 'compile-on-runtime-source-change.ts'],
					body: compileTriggerSource,
				},
				{
					kind: 'createTextAtPath',
					parent: action.root,
					path: ['.pro', 'skills', 'example-request.ts'],
					body: exampleRequest,
				},
				{
					kind: 'createTextAtPath',
					parent: action.root,
					path: ['.pro', 'skills', 'summarize.ts'],
					body: summarize,
				},
				{
					kind: 'createTextAtPath',
					parent: action.root,
					path: ['.pro', 'skills', 'reflect.ts'],
					body: reflect,
				},
			],
			reactions: [
				{
					skill: 'compile',
					input: {},
				},
			],
			warnings,
		};
	},
});

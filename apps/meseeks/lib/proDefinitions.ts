import { z } from 'zod/v3';
import {
	INTELLIGENCES,
	RECOMMENDED_INTELLIGENCE_KEYS,
	displayIntelligence,
	estimateIntelligenceCost,
	referenceIntelligence,
	referenceIntelligenceSelection,
	type Intelligence,
	type IntelligenceKey,
} from 'schemas/intelligenceSchema';
import { skillInputArgumentSchema } from 'schemas/skillSchema';

export const managedSeedVersion = '2026-06-09.pro-reference-vfs-runtime.8';

export { estimateIntelligenceCost, referenceIntelligence, referenceIntelligenceSelection };
export type { Intelligence, IntelligenceKey };

export const intelligences = Object.values(INTELLIGENCES).map((intelligence) =>
	displayIntelligence({ key: intelligence.key }),
);

export const recommendedIntelligences = RECOMMENDED_INTELLIGENCE_KEYS.map((key) => displayIntelligence({ key }));

const loopDefinitionSchema = z.object({
	key: z.string().min(1),
	name: z.string().min(1),
	description: z.string().default(''),
	defaultIntelligenceKey: z.string().min(1),
	visual: z.object({
		icon: z.string().min(1),
		color: z.string().min(1),
		tint: z.string().min(1),
	}),
});

export type ManagedLoop = z.infer<typeof loopDefinitionSchema>;

export const managedLoops: ManagedLoop[] = [
	loopDefinitionSchema.parse({
		key: '@pro/Ask',
		name: 'Ask',
		description: 'Reply once, then stop.',
		defaultIntelligenceKey: 'Cheap',
		visual: {
			icon: 'message-circle',
			color: 'sky',
			tint: 'sky',
		},
	}),
	loopDefinitionSchema.parse({
		key: '@pro/Seek',
		name: 'Seek',
		description: 'Plan, iterate, and stop when done or blocked.',
		defaultIntelligenceKey: 'Efficient',
		visual: {
			icon: 'radar',
			color: 'emerald',
			tint: 'emerald',
		},
	}),
];

const planInstructions = [
	'You are running the Seek planning step for a PRO task file.',
	'Infer the durable task state from the file content, tags, latest user message, and recent actions.',
	'The Latest user message is the primary new human instruction. The existing file content is prior state to revise, not a reason to ignore that message.',
	'Do not answer the user directly. Do not write chat prose.',
	'Return JSON only, with no markdown fence and no text before or after it.',
	'The JSON shape is: {"title":"short title under 60 chars","body":"MDX task plan/instructions that should replace the file body","tags":[{"key":"kind","value":"task"},{"key":"status","value":"active"}],"note":"short user-visible summary of what changed"}.',
	'Use body for future work and durable constraints. If the user corrected a wrong assumption, include the correction and wrong assumption in the body so later work does not repeat it.',
	'Use tags to update task-file routing/status conventions when needed. Include kind=task and status=active for active task files.',
	'Internal action IDs, trigger IDs, loop IDs, and scheduler metadata are debug-only. Do not copy them into the task body unless the human explicitly wrote them.',
	'Do not claim the task is complete during planning.',
].join('\n');

const iterateInstructions = [
	'You are running the Seek iteration step for a PRO task file.',
	'Use the plan, current file content, and recent actions to make concrete progress.',
	'Return JSON only, with no markdown fence and no text before or after it.',
	'The JSON shape is: {"body":"optional replacement file body when you change durable task state","tags":[{"key":"status","value":"done"}],"state":"continue|done|blocked","note":"short user-visible summary"}.',
	'If the plan says to update the file body and you can do it now, return body with the replacement content.',
	'If body still contains an unchecked checklist item or an explicit Next step, state must not be done.',
	'If the task is complete after your mutation, include status=done and state=done.',
	'If you need the user or cannot continue safely, use state=blocked.',
	'Otherwise use state=continue.',
	'Internal action IDs, trigger IDs, loop IDs, and scheduler metadata are debug-only. Do not mention them unless the human explicitly wrote them.',
].join('\n');

const managedSkillSchema = z.object({
	key: z.string().min(1),
	name: z.string().min(1),
	description: z.string().default(''),
	kind: z.enum(['soft', 'code']),
	input: z.array(skillInputArgumentSchema).default([]),
	body: z.string().default(''),
});

export type ManagedSkill = z.infer<typeof managedSkillSchema>;

export const managedSkills: ManagedSkill[] = [
	managedSkillSchema.parse({
		key: 'plan',
		name: 'plan',
		description: 'Update the task file into a durable plan.',
		kind: 'soft',
		input: [],
		body: planInstructions,
	}),
	managedSkillSchema.parse({
		key: 'iterate',
		name: 'iterate',
		description: 'Advance a planned task until done or blocked.',
		kind: 'soft',
		input: [
			{
				key: 'maxDepth',
				type: 'integer',
				required: false,
				description: 'Maximum Seek iterations allowed for this run.',
			},
			{
				key: 'iteration',
				type: 'integer',
				required: false,
				description: 'Current Seek iteration number.',
			},
		],
		body: iterateInstructions,
	}),
];

const managedComponentSchema = z.object({
	key: z.string().min(1),
	name: z.string().min(1),
	body: z.string().min(1),
});

export type ManagedComponent = z.infer<typeof managedComponentSchema>;

function routeComponentBody(value: unknown) {
	//
	return JSON.stringify(value, null, 2);
}

export const managedComponents: ManagedComponent[] = [
	managedComponentSchema.parse({
		key: '@pro/components/QuickCreate',
		name: 'QuickCreate.reactor.json',
		body: routeComponentBody({
			primitive: 'quick-create',
		}),
	}),
	managedComponentSchema.parse({
		key: '@pro/components/InboxList',
		name: 'InboxList.reactor.json',
		body: routeComponentBody({
			primitive: 'file-list',
			filter: 'inbox',
		}),
	}),
	managedComponentSchema.parse({
		key: '@pro/components/TaskList',
		name: 'TaskList.reactor.json',
		body: routeComponentBody({
			primitive: 'file-list',
			filter: 'tasks',
		}),
	}),
	managedComponentSchema.parse({
		key: '@pro/components/FileWorkspace',
		name: 'FileWorkspace.reactor.json',
		body: routeComponentBody({
			primitive: 'file-workspace',
			list: 'tasks',
		}),
	}),
];

const managedTriggerHandlerSchema = z.object({
	key: z.string().min(1),
	name: z.string().min(1),
	body: z.string().min(1),
});

export type ManagedTriggerHandler = z.infer<typeof managedTriggerHandlerSchema>;

export const managedTriggerHandlers: ManagedTriggerHandler[] = [
	managedTriggerHandlerSchema.parse({
		key: '@pro/triggers/Ask',
		name: 'Ask.trigger.js',
		body: `(context) => {
	if (context.action?.skillKey !== "say") return { proposals: [] };

	return {
		proposals: [{
			skillKey: "think",
			args: { mode: "reply" },
		}],
	};
}`,
	}),
	managedTriggerHandlerSchema.parse({
		key: '@pro/triggers/Seek',
		name: 'Seek.trigger.js',
		body: `(context) => {
	const action = context.action || {};
	const metadata = action.result?.metadata || {};
	const maxDepth = 8;

	if (action.skillKey === "say") {
		return {
			proposals: [{
				skillKey: "plan",
				args: {},
			}],
		};
	}

	if (action.skillKey === "plan") {
		return {
			proposals: [{
				skillKey: "iterate",
				args: { maxDepth, iteration: 1 },
			}],
		};
	}

	const iteration = Number(action.args?.iteration || 1);
	if (action.skillKey === "iterate" && metadata.seekState === "continue" && iteration < maxDepth) {
		return {
			proposals: [{
				skillKey: "iterate",
				args: { maxDepth, iteration: iteration + 1 },
			}],
		};
	}

	return { proposals: [] };
}`,
	}),
];

const managedLoopTriggerSchema = z.object({
	loopKey: z.string().min(1),
	handlerKey: z.string().min(1),
});

export type ManagedLoopTrigger = z.infer<typeof managedLoopTriggerSchema>;

export const managedLoopTriggers: ManagedLoopTrigger[] = [
	managedLoopTriggerSchema.parse({
		loopKey: '@pro/Ask',
		handlerKey: '@pro/triggers/Ask',
	}),
	managedLoopTriggerSchema.parse({
		loopKey: '@pro/Seek',
		handlerKey: '@pro/triggers/Seek',
	}),
];

export const managedRoutes = [
	{
		slug: '/',
		componentKey: '@pro/components/QuickCreate',
	},
	{
		slug: '/inbox',
		componentKey: '@pro/components/InboxList',
	},
	{
		slug: '/tasks',
		componentKey: '@pro/components/TaskList',
	},
	{
		slug: '/tasks/:id',
		componentKey: '@pro/components/FileWorkspace',
	},
	{
		slug: '/new',
		componentKey: '@pro/components/QuickCreate',
	},
];

export const endpointHandlerExamples = {
	get: `(context) => ({
	proposals: [{
		skillKey: "think",
		args: {
			method: context.request.method,
			path: context.request.path
		},
		loop: null
	}]
})`,
	postJson: `(context) => ({
	proposals: [{
		skillKey: "think",
		args: {
			contentType: context.request.headers["content-type"] || "",
			body: context.request.body
		},
		loop: null
	}]
})`,
	formData: `(context) => ({
	proposals: [{
		skillKey: "think",
		args: {
			contentType: context.request.headers["content-type"] || "",
			bodyBytes: context.request.body.length
		},
		loop: null
	}]
})`,
};

export function rootFileNameFor(user: { name?: string }) {
	return `${user.name || 'My'} Life`;
}

import { z } from 'zod/v3';
import { internalMutation } from 'lib/convex';
import { asBigInt } from 'lib/money';
import { zodToString } from 'lib/zodToString';
import { skillSchema } from 'schemas/skillSchema';
import type { MutationCtx } from './_generated/server';

const isPro = 'isPro';

const defaultComponents = [
	{
		slug: 'list',
		body: '<Inbox />',
	},
	{
		slug: 'task',
		body: '<Task />',
	},
	{
		slug: 'new',
		body: '<QuickSeek />',
	},
];

const defaultSkills = [
	skillSchema.parse({
		kind: 'soft',
		key: 'instruct',
		cost: 'dynamic',
		priority: 900,
		preApprovedCost: asBigInt({ dollars: 0.5 }),
		owner: isPro,
		author: 'built-in',
		description: 'Infer the user intent and decide the next task action.',
		inputSchema: zodToString(z.object({})),
		config: {
			model: 'auto',
			historyMode: 'since last instructed',
			availableSkills: [
				'askForClarification', //
				'discard',
				'updateInstructions',
				'iterate',
			],
			temperature: 0.5,
			instructions: [
				`You are the task-intent router. Infer what the user's latest action means for the current task, then call exactly one tool.`,
				`Do not answer the user directly. Do not output free text.`,
				`Call updateInstructions() when the latest user action changes, corrects, narrows, expands, or adds context to the task.`,
				`Call iterate() when the current title/instructions already represent the user's intent and the task should continue.`,
				`Call askForClarification() only when a missing critical detail would force guessing the task branch.`,
				`Call discard() only when the user clearly wants to cancel, abandon, archive, delete, stop, or mark the task irrelevant.`,
				`When updating instructions, keep title under 60 characters, put future work in instructions, and put past corrections or wrong assumptions in summary.`,
				`Available skills selected for the task must come from the active skills list when possible.`,
				`<context>`,
				`  <userInfo>{{userInfo}}</userInfo>`,
				`  <activeSkills>{{activeSkills}}</activeSkills>`,
				`  <currentTask>{{task}}</currentTask>`,
				`  <taskWorkspace>{{taskWorkspace}}</taskWorkspace>`,
				`  <activeSchedules>{{taskSchedules}}</activeSchedules>`,
				`  <currentDate>{{currentDate}}</currentDate>`,
				`</context>`,
			].join('\n'),
		},
	}),
	skillSchema.parse({
		kind: 'soft',
		key: 'iterate',
		cost: 'dynamic',
		priority: 1000,
		preApprovedCost: asBigInt({ dollars: 0.5 }),
		owner: isPro,
		author: 'built-in',
		description: 'Progress the task until it is resolved or blocked.',
		inputSchema: zodToString(z.object({})),
		config: {
			model: 'auto',
			historyMode: 'since last instructed',
			availableSkills: ['{{taskSkills}}', 'done', 'say', 'reason', 'setUserInfo', 'schedule', 'cancelSchedule'],
			temperature: 0.7,
			instructions: [
				`Progress the task by calling exactly one tool.`,
				`Use the current task title, instructions, summary, and recent history as the source of truth.`,
				`For direct questions, translations, simple explanations, and small decisions, call say() with a compact answer, then call done() on the next iteration if the answer is sufficient.`,
				`Use task-selected skills when they are clearly useful. Skills with empty input schemas are valid; call them with {}.`,
				`Use reason() when a short reasoning step would help decide the next action.`,
				`Use schedule() for reminders, delayed work, recurring checks, and monitoring. After scheduling, stop the loop with done() unless more immediate work is required.`,
				`Call done({ reason: "resolved" }) when the task is complete.`,
				`Call done({ reason: "blocked", message }) when progress requires user input or external access you do not have.`,
				`Do not repeat a previous say() unless there is new information.`,
				`<context>`,
				`  <userInfo>{{userInfo}}</userInfo>`,
				`  <activeSkills>{{activeSkills}}</activeSkills>`,
				`  <currentTask>{{task}}</currentTask>`,
				`  <taskWorkspace>{{taskWorkspace}}</taskWorkspace>`,
				`  <activeSchedules>{{taskSchedules}}</activeSchedules>`,
				`  <currentDate>{{currentDate}}</currentDate>`,
				`</context>`,
			].join('\n'),
		},
	}),
];

export const _all = internalMutation({
	args: z.object({}),
	handler: async (ctx) => {
		//
		const components = await seedComponents(ctx);
		const skills = await seedSkills(ctx);

		return { components, skills };
	},
});

async function seedComponents(ctx: MutationCtx) {
	//
	let inserted = 0;
	let updated = 0;

	for (const component of defaultComponents) {
		//
		const existing = await ctx.db
			.query('components')
			.withIndex('by_owner_slug', (q) => q.eq('owner', isPro).eq('slug', component.slug))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, { body: component.body, isPublic: false });
			updated += 1;
			continue;
		}

		await ctx.db.insert('components', {
			owner: isPro,
			slug: component.slug,
			body: component.body,
			isPublic: false,
		});

		inserted += 1;
	}

	return { inserted, updated };
}

async function seedSkills(ctx: MutationCtx) {
	//
	let inserted = 0;
	let updated = 0;

	for (const skill of defaultSkills) {
		//
		const existing = await ctx.db
			.query('skills')
			.withIndex('by_owner_key', (q) => q.eq('owner', isPro).eq('key', skill.key))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, skill);
			updated += 1;
			continue;
		}

		await ctx.db.insert('skills', skill);
		inserted += 1;
	}

	return { inserted, updated };
}

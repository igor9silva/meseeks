import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { mutation, query } from '../lib';
import { zodToString } from '../lib/zodToString';
import { env } from '../schemas/envSchema';
import { builtInSkillSchema, newSkillSchema } from '../schemas/skillSchema';
import { current as getCurrentUser } from '../users/public';
import { _builtInSkills } from './builtIn';
import { _create, _findAllByOwner, _update } from './private';

export const findAllPublic = query({
	handler: async (ctx) => {
		//
		const skills = await _findAllByOwner(ctx, { owner: 'isPro' });

		// remove headers from isPro hard skills, as they may contain passwords
		for (const skill of skills) {
			if (skill.owner === 'isPro' && skill.kind === 'hard') {
				skill.config.headers = {};
			}
		}

		return skills;
	},
});

export const findAllPersonal = query({
	handler: async (ctx) => {
		const currentUser = await getCurrentUser(ctx, {});
		return await _findAllByOwner(ctx, { owner: currentUser._id });
	},
});

function buildInSkillToDoc(
	key: string, //
	skill: (typeof _builtInSkills)[keyof typeof _builtInSkills],
) {
	return builtInSkillSchema.parse({
		key,
		description: skill.description,
		inputSchema: zodToString(skill.parameters),
		preApprovedCost: skill.preApprovedCost,
		knownReactions: skill.knownReactions,
		kind: 'built-in',
		owner: 'built-in',
		author: 'built-in',
		cost: 0n,
	});
}

export const findAllInnate = query({
	handler: async (ctx) => {
		//
		const builtInTools = Object.entries(_builtInSkills)
			.filter(([_, tool]) => !tool.hidden)
			.sort(([_, a], [__, b]) => a.priority - b.priority);

		return builtInTools.map(([key, tool]) => buildInSkillToDoc(key, tool));
	},
});

export const findOneInnate = query({
	args: {
		skillKey: z.string(),
	},
	handler: async (ctx, { skillKey }) => {
		//
		const skill = _builtInSkills[skillKey as keyof typeof _builtInSkills];

		return buildInSkillToDoc(skillKey, skill);
	},
});

export const findOne = query({
	args: {
		skillId: zid('skills'),
	},
	handler: async (ctx, { skillId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const skill = await ctx.db.get(skillId);

		if (!skill) throw new Error('Skill not found');

		if (skill.owner !== currentUser._id && skill.owner !== 'isPro') {
			// purposefully do not mention authorization
			throw new Error('Skill not found');
		}

		// remove headers from isPro hard skills, as they may contain passwords
		if (skill.owner === 'isPro' && skill.kind === 'hard') {
			skill.config.headers = {};
		}

		return {
			...skill,
			isEditable: skill.owner === currentUser._id,
		};
	},
});

export const availableIntelligences = query({
	handler: async (ctx) => {
		// TODO: make this list dynamic
		return {
			default: env.DEFAULT_MODEL,
			recommended: [
				{
					key: 'xai/grok-code-fast-1',
					name: 'Grok Code Fast 1',
					provider: 'xAI',
					description: 'Best cost/performance ratio — a bit slow.',
				},
				{
					key: 'moonshot/kimi-2',
					name: 'Kimi 2',
					provider: 'Moonshot',
					description: 'Best cost/performance ratio — a bit slow.',
				},
				{
					key: 'anthropic/claude-4-sonnet',
					name: 'Claude 4 Sonnet',
					provider: 'Anthropic',
					description: 'Best overall — 15x more costly than Kimi.',
				},
				{
					key: 'anthropic/claude-4-opus',
					name: 'Claude 4 Opus',
					provider: 'Anthropic',
					description: 'GOAT — use for extreme tasks, expensive!',
				},
			],
			all: [
				{
					key: 'google/gemini-2.5-flash',
					name: 'Gemini 2.5 Flash',
					provider: 'Google',
					description: 'Nicely balanced, cheap and fast',
				},
				{
					key: 'xai/grok-3-mini',
					name: 'Grok 3 Mini',
					provider: 'xAI',
					description: 'Cheap and fast, can be useful',
				},
				{
					key: 'anthropic/claude-3.5-haiku',
					name: 'Claude 3.5 Haiku',
					provider: 'Anthropic',
					description: 'Surprisingly very good, very cheap',
				},
				{
					key: 'groq/qwen3-32b',
					name: 'Qwen 32B',
					provider: 'Groq',
					description: 'Insanely faaaast, but not very smart',
				},
				{
					key: 'cerebras/qwen3-235b',
					name: 'Qwen 235B',
					provider: 'Cerebras',
				},
				{
					key: 'google/gemini-2.5-pro',
					name: 'Gemini 2.5 Pro',
					provider: 'Google',
				},
				{
					key: 'google/gemini-2.5-flash-lite',
					name: 'Gemini 2.5 Flash Lite',
					provider: 'Google',
				},
				{
					key: 'openai/gpt-4.1',
					name: 'GPT-4.1',
					provider: 'OpenAI',
				},
				{
					key: 'openai/gpt-4.1-mini',
					name: 'GPT-4.1 Mini',
					provider: 'OpenAI',
				},
				{
					key: 'openai/gpt-4.1-nano',
					name: 'GPT-4.1 Nano',
					provider: 'OpenAI',
				},
				{
					key: 'xai/grok-3',
					name: 'Grok 3',
					provider: 'xAI',
				},
				{
					key: 'deepseek/deepseek-v3',
					name: 'DeepSeek V3',
					provider: 'DeepSeek',
				},
			],
		};
	},
});

export const create = mutation({
	args: {
		skill: newSkillSchema,
	},
	handler: async (ctx, { skill }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await _create(ctx, { skill, userId: currentUser._id });
	},
});

export const update = mutation({
	args: {
		skill: newSkillSchema,
	},
	handler: async (ctx, { skill }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await _update(ctx, { skill, userId: currentUser._id });
	},
});

export const ensureSkillOwner = async (
	ctx: QueryCtx | MutationCtx, //
	args: {
		skillId: Id<'skills'>;
	},
) => {
	//
	const currentUser = await getCurrentUser(ctx, {});
	const skill = await ctx.db.get(args.skillId);

	if (!skill) throw new Error('Skill not found');
	if (skill.owner !== currentUser._id) throw new Error('Skill not found'); // purposefully do not mention authorization

	return { currentUser, skill };
};

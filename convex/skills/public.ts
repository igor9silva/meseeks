import { zid } from 'convex-helpers/server/zod';
import { Id } from '../_generated/dataModel';
import { MutationCtx, QueryCtx } from '../_generated/server';
import { mutation, query } from '../lib';
import { builtInSkillSchema, newSkillSchema } from '../schemas/skillSchema';
import { current as getCurrentUser } from '../users/public';
import { zodToString } from '../utils/zodToString';
import { _builtInSkills } from './builtIn';
import { _create, _findAllByOwner, _update } from './private';

export const findAllPublic = query({
	handler: async (ctx) => {
		return await _findAllByOwner(ctx, { owner: 'isPro' });
	},
});

export const findAllPersonal = query({
	handler: async (ctx) => {
		const currentUser = await getCurrentUser(ctx, {});
		return await _findAllByOwner(ctx, { owner: currentUser._id });
	},
});

export const findAllInnate = query({
	handler: async (ctx) => {
		//
		const innateSkills = [];

		for (const key in _builtInSkills) {
			//
			const builtInTool = _builtInSkills[key as keyof typeof _builtInSkills];

			innateSkills.push(
				builtInSkillSchema.parse({
					key,
					description: builtInTool.description,
					inputSchema: zodToString(builtInTool.parameters),
					preApprovedCost: builtInTool.preApprovedCost,
					knownReactions: builtInTool.knownReactions,
					kind: 'built-in',
					owner: 'built-in',
					author: 'built-in',
					cost: 0n,
				}),
			);
		}

		return innateSkills;
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
			default: 'grok/grok-3-mini',
			recommended: [
				{
					key: 'anthropic/claude-4-sonnet',
					name: 'Claude 4 Sonnet',
					provider: 'Anthropic',
					description: 'Best overall',
				},
				{
					key: 'grok/grok-3-mini',
					name: 'Grok 3 Mini',
					provider: 'xAI',
					description: 'Best value (recommended for most tasks)',
				},
				{
					key: 'anthropic/claude-3.5-haiku',
					name: 'Claude 3.5 Haiku',
					provider: 'Anthropic',
					description: 'Another cost-efficient alternative',
				},
			],
			all: [
				{
					key: 'groq/qwen3-32b',
					name: 'Qwen 32B',
					provider: 'Groq',
				},
				{
					key: 'anthropic/claude-4-opus',
					name: 'Claude 4 Opus',
					provider: 'Anthropic',
				},
				{
					key: 'google/gemini-2.5-pro',
					name: 'Gemini 2.5 Pro',
					provider: 'Google',
				},
				{
					key: 'google/gemini-2.5-flash',
					name: 'Gemini 2.5 Flash',
					provider: 'Google',
				},
				{
					key: 'google/gemini-2.0-flash-lite',
					name: 'Gemini 2.0 Flash Lite',
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
					key: 'xai/grok-3-mini',
					name: 'Grok 3 Mini',
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
		updatedSkill: newSkillSchema,
	},
	handler: async (ctx, { updatedSkill }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await _update(ctx, { updatedSkill, userId: currentUser._id });
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

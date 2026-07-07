import { z } from 'zod/v3';
import type { ActionCtx } from 'convex/_generated/server';
import { internal } from 'convex/_generated/api';
import { preparationActionDetailSchema } from 'schemas/actionDetailSchema';
import { type ClaimedAction, performArgsSchema, type PerformResult } from 'schemas/reactorSchema';
import { defineMutation } from 'lib/convex';
import { stringToZod } from 'lib/zodToString';
import { findActionPreparation } from '../action/details.private';
import { findAction } from '../actions.private';
import { executePreparationSchema, performExecute } from '../execute.private';
import { findInstinct } from '../instincts/index.private';
import { askMagicRock, magicRockPreparationSchema } from '../magicRock.private';
import { performRequest, requestPreparationSchema } from '../request.private';
import { cleanupStaged, stageText } from './stage.private';
import { resolveCallableSkill, validateSkillInput } from './claim.private';

export const loadForPerform = defineMutation({
	args: performArgsSchema,
	handler: async (ctx, { action }): Promise<ClaimedAction> => {
		//
		const row = await findAction(ctx, { action });
		if (row.status !== 'enqueued') throw new Error('Action is not enqueued.');
		if (!row.claimedAt) throw new Error('Action is not claimed.');
		if (!row.scheduledFunctionId) throw new Error('Action is not scheduled.');
		if (row.startedAt) throw new Error('Action already started.');

		const skill = await resolveCallableSkill(ctx, {
			owner: row.owner,
			root: row.root,
			key: row.skill,
		});
		const input = validateSkillInput(skill, row.input);
		const preparation = await findActionPreparation(ctx, { action: row._id });
		const now = Date.now();

		await ctx.db.patch(row._id, {
			status: 'running',
			startedAt: now,
		});

		return {
			action: {
				...row,
				status: 'running',
				startedAt: now,
			},
			input,
			preparation,
			skill,
			warnings: preparation.warnings ?? [],
		};
	},
});

export async function perform(ctx: ActionCtx, args: z.infer<typeof performArgsSchema>) {
	//
	let claimed: ClaimedAction | undefined;

	try {
		claimed = await ctx.runMutation(internal.reactor._loadForPerform, args);
		const result = await performAction(claimed);
		await settle(ctx, result);

		return result;
	} catch (error) {
		if (!claimed) throw error;

		const message = errorMessage(error);
		await settle(ctx, {
			action: claimed.action._id,
			status: 'failed',
			error: message,
			warnings: claimed.warnings,
		});

		throw error;
	}
}

function preparationContext(preparation: z.infer<typeof preparationActionDetailSchema>) {
	//
	if (preparation.skillKind === 'instinct') return preparation.context;
	if (preparation.skillKind === 'think') {
		return {
			intelligence: preparation.intelligence,
			provider: preparation.provider,
			model: preparation.model,
			system: preparation.system,
			prompt: preparation.prompt,
			estimated: preparation.estimated,
			warnings: preparation.warnings,
		};
	}
	if (preparation.skillKind === 'request') {
		return {
			url: preparation.url,
			method: preparation.method,
			headers: preparation.headers,
			body: preparation.body,
			timeoutMs: preparation.timeoutMs,
			warnings: preparation.warnings,
		};
	}

	return {
		root: preparation.root,
		code: preparation.code,
		language: preparation.language,
		timeoutSeconds: preparation.timeoutSeconds,
		warnings: preparation.warnings,
	};
}

async function performAction(claimed: ClaimedAction): Promise<PerformResult> {
	//
	if (claimed.skill.source !== 'instinct') return await performStoredSkill(claimed);

	return await performInstinct(claimed);
}

async function performInstinct(claimed: ClaimedAction): Promise<PerformResult> {
	//
	const instinct = findInstinct(claimed.skill.key);
	if (!instinct) return await skipped(claimed, `The ${claimed.action.skill} skill is not implemented yet.`);

	const result = await instinct.perform(
		{
			action: claimed.action,
			input: claimed.input,
			preparation: preparationContext(claimed.preparation),
			warnings: claimed.warnings,
		},
		{ stageText },
	);

	return validateSkillOutput(claimed, result);
}

async function performStoredSkill(claimed: ClaimedAction): Promise<PerformResult> {
	//
	if (claimed.skill.source === 'instinct') throw new Error('Expected stored skill.');

	if (claimed.skill.kind === 'request') return await performConfiguredRequest(claimed);
	if (claimed.skill.kind === 'think') return await performConfiguredThink(claimed);

	return await performConfiguredExecute(claimed);
}

async function performConfiguredThink(claimed: ClaimedAction): Promise<PerformResult> {
	//
	if (claimed.skill.source === 'instinct') throw new Error('Expected stored skill.');

	const magicRock = magicRockPreparationSchema.parse(preparationContext(claimed.preparation));
	const result = await askMagicRock(magicRock);
	const output = await stageText({
		owner: claimed.action.owner,
		content: result.text,
		contentType: 'text/mdx; charset=utf-8',
	});

	return {
		action: claimed.action._id,
		status: 'succeeded',
		output,
		providerReceipt: {
			provider: result.provider,
			model: result.model,
			request: {
				prompt: magicRock.prompt,
				system: magicRock.system,
			},
			response: { outputLength: result.text.length },
			usage: result.usage,
		},
		warnings: claimed.warnings.concat(result.warnings),
	};
}

async function performConfiguredRequest(claimed: ClaimedAction): Promise<PerformResult> {
	//
	if (claimed.skill.source === 'instinct') throw new Error('Expected stored skill.');

	return await performRequest({
		action: claimed.action,
		preparation: requestPreparationSchema.parse(preparationContext(claimed.preparation)),
		stageText,
		warnings: claimed.warnings,
	});
}

async function performConfiguredExecute(claimed: ClaimedAction): Promise<PerformResult> {
	//
	if (claimed.skill.source === 'instinct') throw new Error('Expected stored skill.');

	return await performExecute({
		action: claimed.action,
		preparation: executePreparationSchema.parse(preparationContext(claimed.preparation)),
		stageText,
		warnings: claimed.warnings,
	});
}

async function skipped(claimed: ClaimedAction, reason: string): Promise<PerformResult> {
	//
	const output = await stageText({
		owner: claimed.action.owner,
		content: reason,
		contentType: 'text/mdx; charset=utf-8',
	});

	return {
		action: claimed.action._id,
		status: 'skipped',
		output,
		warnings: claimed.warnings.concat(reason),
	};
}

function validateSkillOutput(claimed: ClaimedAction, result: PerformResult): PerformResult {
	//
	if (claimed.skill.source !== 'instinct') {
		const validation = stringToZod(claimed.skill.outputSchema).safeParse(outputForValidation(result));
		if (validation.success) return result;

		return {
			...result,
			warnings: (result.warnings ?? []).concat(`Skill output did not match schema: ${validation.error.message}`),
		};
	}

	const instinct = findInstinct(claimed.skill.key);
	if (!instinct) return result;

	const output = outputForValidation(result);
	const validation = instinct.outputSchema.safeParse(output);
	if (validation.success) return result;

	return {
		...result,
		warnings: (result.warnings ?? []).concat(`Skill output did not match schema: ${validation.error.message}`),
	};
}

function outputForValidation(result: PerformResult) {
	//
	if (!result.output) {
		return {
			summary: result.status,
		};
	}

	return {
		content: result.output.content,
		contentType: result.output.contentType,
	};
}

async function settle(ctx: ActionCtx, result: PerformResult) {
	//
	try {
		await ctx.runMutation(internal.reactor._settle, result);
	} catch (error) {
		await cleanupStaged(result);
		throw error;
	}
}

function errorMessage(error: unknown) {
	//
	if (error instanceof Error) return error.message;

	return String(error);
}

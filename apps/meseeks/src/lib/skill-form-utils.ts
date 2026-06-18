import type { Doc } from 'convex/_generated/dataModel';
import { asBigInt } from 'lib/money';
import { newSkillSchema, requestSkillSchema, thinkSkillSchema } from 'schemas/skillSchema';
import type { DefaultValues } from 'react-hook-form';
import { z } from 'zod/v3';

type NewSkillUnion = z.infer<typeof newSkillSchema>;
type NewThinkSkill = Extract<NewSkillUnion, { kind: 'think' }>;
type NewRequestSkill = Extract<NewSkillUnion, { kind: 'request' }>;

export const softSkillFormSchema = thinkSkillSchema
	.omit({
		author: true,
		owner: true,
		cost: true,
		source: true,
		root: true,
		sourceFile: true,
		sourcePath: true,
		sourceHash: true,
		compiledBy: true,
		compiledAt: true,
	})
	.extend({
		config: thinkSkillSchema.shape.config.partial(),
	});

export const hardSkillFormSchema = requestSkillSchema
	.omit({
		author: true,
		owner: true,
		cost: true,
		source: true,
		root: true,
		sourceFile: true,
		sourcePath: true,
		sourceHash: true,
		compiledBy: true,
		compiledAt: true,
	})
	.extend({
		config: requestSkillSchema.shape.config.partial(),
		bodyTemplate: z.string().default('{}'),
	});

export type SoftSkillFormValues = z.infer<typeof softSkillFormSchema>;
export type HardSkillFormValues = z.infer<typeof hardSkillFormSchema>;

export function getDefaultSoftSkill(skill?: Doc<'skills'>): DefaultValues<SoftSkillFormValues> {
	//
	if (!skill || skill.source === 'instinct' || skill.kind !== 'think') {
		return {
			key: '',
			description: '',
			kind: 'think',
			inputSchema: '{}',
			outputSchema: '{}',
			preApprovedCost: 'none',
			config: {
				model: 'auto',
				temperature: 0.7,
				instructions: '',
				availableSkills: [],
				historyMode: 'since last instructed',
			},
		};
	}

	return {
		key: skill.key,
		description: skill.description,
		kind: 'think',
		inputSchema: skill.inputSchema,
		outputSchema: skill.outputSchema,
		preApprovedCost: skill.preApprovedCost || 'none',
		config: skill.config,
	};
}

export function getDefaultHardSkill(skill?: Doc<'skills'>): DefaultValues<HardSkillFormValues> {
	//
	if (!skill || skill.source === 'instinct' || skill.kind !== 'request') {
		return {
			key: '',
			description: '',
			kind: 'request',
			inputSchema: '{}',
			outputSchema: '{}',
			preApprovedCost: 'none',
			config: {
				url: '',
				method: 'GET',
				headers: {},
				paramMappings: [],
			},
			bodyTemplate: '{}',
		};
	}

	return {
		key: skill.key,
		description: skill.description,
		kind: 'request',
		inputSchema: skill.inputSchema,
		outputSchema: skill.outputSchema,
		preApprovedCost: skill.preApprovedCost || 'none',
		config: skill.config,
		bodyTemplate: JSON.stringify(skill.config.body?.template || {}, null, 2),
	};
}

export function buildSoftSkillFromForm(data: SoftSkillFormValues): NewThinkSkill {
	//
	return {
		key: data.key,
		description: data.description,
		kind: 'think',
		inputSchema: data.inputSchema,
		outputSchema: data.outputSchema,
		preApprovedCost: data.preApprovedCost,
		cost: 'dynamic',
		config: {
			model: data.config?.model || 'auto',
			instructions: data.config?.instructions || '',
			temperature: data.config?.temperature || 0.7,
			availableSkills: data.config?.availableSkills || [],
			historyMode: data.config?.historyMode || 'since last instructed',
		},
	};
}

export function buildHardSkillFromForm(data: HardSkillFormValues): NewRequestSkill {
	//
	const bodyTemplate = parseBodyTemplate(data.bodyTemplate);

	return {
		key: data.key,
		description: data.description,
		kind: 'request',
		inputSchema: data.inputSchema,
		outputSchema: data.outputSchema,
		preApprovedCost: data.preApprovedCost,
		cost: asBigInt({ dollars: 0 }),
		config: {
			url: data.config?.url || '',
			method: data.config?.method || 'GET',
			headers: data.config?.headers || {},
			paramMappings: data.config?.paramMappings || [],
			body: Object.keys(bodyTemplate).length > 0 ? { template: bodyTemplate } : undefined,
		},
	};
}

function parseBodyTemplate(value: string) {
	//
	let json: unknown;

	try {
		json = JSON.parse(value);
	} catch {
		throw new Error('Invalid JSON in body template.');
	}

	const parsed = z.record(z.unknown()).safeParse(json);
	if (!parsed.success) throw new Error('Body template must be a JSON object.');

	return parsed.data;
}

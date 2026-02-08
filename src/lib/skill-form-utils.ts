import { Doc } from 'convex/_generated/dataModel';
import { asBigInt } from 'convex/lib/money';
import { hardSkillSchema, newSkillSchema, skillSetKeySchema, softSkillSchema } from 'convex/schemas/skillSchema';
import { DefaultValues } from 'react-hook-form';
import { z } from 'zod';

// Extract the individual schemas from newSkillSchema union
type NewSkillUnion = z.infer<typeof newSkillSchema>;
type NewSoftSkill = Extract<NewSkillUnion, { kind: 'soft' }>;
type NewHardSkill = Extract<NewSkillUnion, { kind: 'hard' }>;

// Create form schemas by making the config fields optional for better UX
const skillSetFormSchema = z.union([
	skillSetKeySchema, //
	z.literal(''),
]);

export const softSkillFormSchema = softSkillSchema.omit({ author: true, owner: true, cost: true }).extend({
	// Make config fields optional with good defaults for form handling
	config: softSkillSchema.shape.config.partial(),
	skillSet: skillSetFormSchema.optional(),
});

export const hardSkillFormSchema = hardSkillSchema.omit({ author: true, owner: true, cost: true }).extend({
	// Make config fields optional with good defaults for form handling
	config: hardSkillSchema.shape.config.partial(),
	// Add bodyTemplate as a required string for easier form handling
	bodyTemplate: z.string().default('{}'),
	skillSet: skillSetFormSchema.optional(),
});

export type SoftSkillFormValues = z.infer<typeof softSkillFormSchema>;
export type HardSkillFormValues = z.infer<typeof hardSkillFormSchema>;

// Default value generators
export function getDefaultSoftSkill(skill?: Doc<'skills'>): DefaultValues<SoftSkillFormValues> {
	//
	if (!skill || skill.kind !== 'soft') {
		return {
			key: '',
			skillSet: '',
			description: '',
			kind: 'soft',
			inputSchema: '{}',
			preApprovedCost: 'none',
			knownReactions: [],
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
		skillSet: skill.skillSet || '',
		description: skill.description,
		kind: 'soft',
		inputSchema: skill.inputSchema,
		preApprovedCost: skill.preApprovedCost || 'none',
		knownReactions: skill.knownReactions || [],
		config:
			'config' in skill
				? skill.config
				: {
						model: 'auto',
						temperature: 0.7,
						instructions: '',
						availableSkills: [],
						historyMode: 'since last instructed',
					},
	};
}

export function getDefaultHardSkill(skill?: Doc<'skills'>): DefaultValues<HardSkillFormValues> {
	//
	if (!skill || skill.kind !== 'hard') {
		return {
			key: '',
			skillSet: '',
			description: '',
			kind: 'hard',
			inputSchema: '{}',
			preApprovedCost: 'none',
			knownReactions: [],
			config: {
				url: '',
				method: 'GET',
				headers: {},
				paramMappings: [],
			},
			bodyTemplate: '{}',
		};
	}

	const config = skill.config;

	return {
		key: skill.key,
		skillSet: skill.skillSet || '',
		description: skill.description,
		kind: 'hard',
		inputSchema: skill.inputSchema,
		preApprovedCost: skill.preApprovedCost || 'none',
		knownReactions: skill.knownReactions || [],
		config,
		bodyTemplate: JSON.stringify(config.body?.template || {}, null, 2),
	};
}

// Convert form data to backend schema format
export function buildSoftSkillFromForm(data: SoftSkillFormValues): NewSoftSkill {
	//
	return {
		key: data.key,
		skillSet: data.skillSet || undefined,
		description: data.description,
		kind: 'soft',
		inputSchema: data.inputSchema,
		preApprovedCost: data.preApprovedCost,
		knownReactions: data.knownReactions || [],
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

export function buildHardSkillFromForm(data: HardSkillFormValues): NewHardSkill {
	//
	let bodyTemplate = {};
	try {
		bodyTemplate = JSON.parse(data.bodyTemplate);
	} catch (e) {
		throw new Error('Invalid JSON in body template');
	}

	return {
		key: data.key,
		skillSet: data.skillSet || undefined,
		description: data.description,
		kind: 'hard',
		inputSchema: data.inputSchema,
		preApprovedCost: data.preApprovedCost,
		knownReactions: data.knownReactions || [],
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

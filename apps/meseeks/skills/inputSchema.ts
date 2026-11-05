import { jsonSchema } from 'ai';
import { z } from 'zod';
import { readSkillSchema } from 'lib/persistedSkillSchema';
import { explicitConjunctions, fromSkillJsonSchema, toSkillJsonSchema } from 'lib/skillJsonSchema';

export function skillInputSchema(source: string | z.ZodType) {
	//
	const stored = typeof source === 'string' ? readSkillSchema(source) : toSkillJsonSchema(source);
	const restored = fromSkillJsonSchema(stored);
	// built-ins retain their original runtime refinements after json arguments have been decoded.
	const validator = typeof source === 'string' ? restored : restored.pipe(source);
	return jsonSchema(
		() => {
			const definition = z.toJSONSchema(
				z.fromJSONSchema(explicitConjunctions(stored), { registry: z.registry() }),
				{
					io: 'input',
					target: 'draft-07',
					override: ({ jsonSchema: node }) => {
						// storage annotations are app-owned; providers receive standard json schema.
						for (const key of Object.keys(node)) if (key.startsWith('x-')) delete node[key];
					},
				},
			);
			return z.record(z.string(), z.json()).parse(definition);
		},
		{
			validate: (value) => {
				const result = validator.safeParse(value);
				if (result.success) return { success: true, value: result.data };
				return { success: false, error: result.error };
			},
		},
	);
}

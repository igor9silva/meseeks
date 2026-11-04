import { isCurrentSkillSchema, normalizeSkillSchema } from './zodToString';

export function prepareSkillSchemaMigration(skill: { inputSchema: string; legacyInputSchema?: string }) {
	//
	const inputSchema = normalizeSkillSchema(skill.inputSchema);
	if (isCurrentSkillSchema(skill.inputSchema)) return;
	return { inputSchema, legacyInputSchema: skill.legacyInputSchema ?? skill.inputSchema };
}

export function inspectSkillSchema(inputSchema: string) {
	//
	try {
		const patch = prepareSkillSchemaMigration({ inputSchema });
		return { status: patch ? ('ready' as const) : ('current' as const) };
	} catch (error) {
		return { status: 'blocked' as const, error: error instanceof Error ? error.message : String(error) };
	}
}

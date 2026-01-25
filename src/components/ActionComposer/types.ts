// skill to be added to queue (before id is assigned)
export type SkillToEnqueue = {
	skillKey: string;
	args: Record<string, unknown>;
	source?: 'input' | 'budget-strip' | 'queue-strip' | 'quick-action';
};

// skill in the queue (has id for tracking)
export type EnqueuedSkill = SkillToEnqueue & {
	id: string;
	enqueuedAt: number; // timestamp for ordering
};

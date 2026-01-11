import type { Doc } from 'convex/_generated/dataModel';

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

// strip-specific props (minimal - strips get only what they need)
export type BaseStripProps = {
	task: Doc<'tasks'>;
	onEnqueue: (skill: SkillToEnqueue) => void;
};

// extended props for strips that need queue access
export type QueueAwareStripProps = BaseStripProps & {
	queue: EnqueuedSkill[];
	onDequeue: (id: string) => void;
};

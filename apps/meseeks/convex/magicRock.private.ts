import type { Id } from './_generated/dataModel';

export type MagicRockContext = {
	owner: Id<'users'>;
	directory?: Id<'files'>;
};

export const askMagicRock = async (): Promise<never> => {
	throw new Error('The old task-bound MagicRock loop is not part of PRO v1. Use reactor.think instead.');
};

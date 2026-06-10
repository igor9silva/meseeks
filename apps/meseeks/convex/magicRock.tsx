import { action } from 'lib/convex';
import { runMagicRock, transcribeAudio } from './magicRock.private';

export const run = action({
	args: runMagicRock.args.shape,
	handler: runMagicRock,
});

export const transcribe = action({
	args: transcribeAudio.args.shape,
	handler: transcribeAudio,
});

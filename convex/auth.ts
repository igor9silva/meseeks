import Google from '@auth/core/providers/google';
import { convexAuth } from '@convex-dev/auth/server';
import { env } from 'schemas/envSchema';
import { seedIfNeeded } from './users.private';

export const { auth, signIn, signOut, store } = convexAuth({
	providers: [
		Google, //
	],
	jwt: {
		durationMs: env.JWT_SESSION_DURATION_MS || 1000 * 60 * 60 * 24 * 7 /* 7 days */,
	},
	session: {
		inactiveDurationMs: env.JWT_SESSION_DURATION_MS || 1000 * 60 * 60 * 24 * 7 /* 7 days */,
	},
	callbacks: {
		async afterUserCreatedOrUpdated(ctx, args) {
			console.debug('afterUserCreatedOrUpdated', args);
			await seedIfNeeded(ctx, { userId: args.userId });
		},
	},
});

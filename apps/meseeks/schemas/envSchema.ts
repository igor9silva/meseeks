import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod/v3';

export const env = createEnv({
	//
	runtimeEnv: process.env,

	server: {
		// app
		SITE_URL: z.string().min(1).describe('The app public URL.'),
		ENV_TYPE: z.enum(['production', 'preview', 'development']),
		NODE_ENV: z.enum(['development', 'production']).default('development'),

		// auth
		BETTER_AUTH_SECRET: z.string().min(1).describe('Better Auth application secret.'),
		AUTH_GOOGLE_ID: z.string().min(1).describe('Google OAuth client ID.'),
		AUTH_GOOGLE_SECRET: z.string().min(1).describe('Google OAuth client secret.'),
		JWT_SESSION_DURATION_MS: z
			.string()
			.min(1)
			// transform to number
			.transform((s) => Number.parseInt(s, 10))
			// make sure transform worked
			.pipe(z.number())
			.describe('JWT session duration in milliseconds.'),

		JWT_SESSION_UPDATE_AGE_MS: z
			.string()
			.min(1)
			// transform to number
			.transform((s) => Number.parseInt(s, 10))
			// make sure transform worked
			.pipe(z.number())
			.describe('Session update age in milliseconds (how often to refresh rolling sessions in background).'),

		// object storage
		OBJECT_STORAGE_BUCKET: z.string().min(1),
		OBJECT_STORAGE_ENDPOINT: z.string().min(1),
		OBJECT_STORAGE_REGION: z.string().min(1).default('auto'),
		OBJECT_STORAGE_ACCESS_KEY_ID: z.string().min(1),
		OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
		OBJECT_STORAGE_ROOT_PREFIX: z.string().min(1),

		// payments
		POLAR_SERVER: z.enum(['sandbox', 'production']).default('sandbox'),
		POLAR_ACCESS_TOKEN: z.string().min(1),
		POLAR_WEBHOOK_SECRET: z.string().min(1),
		POLAR_TOP_UP_ID: z.string().min(1),

		// boxes
		DAYTONA_API_KEY: z.string().min(1),
		DAYTONA_API_URL: z.string().min(1).optional(),
		DAYTONA_TARGET: z.string().min(1).describe('Region/environment, e.g. `us` or `eu`.'),

		// reactor
		ACTION_TIMEOUT_BUFFER_MS: z
			.string()
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number().int().min(1_000).max(590_000))
			.describe('How much earlier than Convex hard timeout actions should abort, in milliseconds.')
			.default('120000'),

		// intelligence providers
		DEEPSEEK_API_KEY: z.string().min(1),
		MOONSHOT_API_KEY: z.string().min(1),
		OPENAI_API_KEY: z.string().min(1),
	},

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * This is true in order to solve these issues.
	 */
	emptyStringAsUndefined: true,
});

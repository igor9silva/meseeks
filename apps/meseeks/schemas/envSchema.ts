import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod/v3';

export const env = createEnv({
	//
	runtimeEnv: process.env,

	server: {
		//
		// app
		SITE_URL: z.string().min(1).describe('The app public URL.'),
		ENV_TYPE: z
			.enum([
				'production', //
				'preview',
				'development',
			])
			.describe('Deployment environment.'),
		NODE_ENV: z
			.enum([
				'development', //
				'production',
			])
			.default('development'),

		// auth
		BETTER_AUTH_SECRET: z.string().min(1).describe('Better Auth application secret.'),
		AUTH_GOOGLE_ID: z.string().min(1).describe('Google OAuth client ID.'),
		AUTH_GOOGLE_SECRET: z.string().min(1).describe('Google OAuth client secret.'),
		JWT_SESSION_DURATION_MS: z
			.string()
			.min(1)
			.transform((value) => Number.parseInt(value, 10))
			.pipe(z.number().int())
			.describe('JWT session duration in milliseconds.'),
		JWT_SESSION_UPDATE_AGE_MS: z
			.string()
			.min(1)
			.transform((value) => Number.parseInt(value, 10))
			.pipe(z.number().int())
			.describe('Session update age in milliseconds (how often to refresh rolling sessions in background).'),

		// object storage, S3-compatible
		OBJECT_STORAGE_BUCKET: z.string().min(1),
		OBJECT_STORAGE_ENDPOINT: z.string().min(1),
		OBJECT_STORAGE_REGION: z.string().min(1).default('auto'),
		OBJECT_STORAGE_ACCESS_KEY_ID: z.string().min(1),
		OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
		OBJECT_STORAGE_PREFIX: z.string().min(1),

		// payments
		POLAR_SERVER: z.enum(['sandbox', 'production']).default('sandbox').describe('Polar server.'),
		POLAR_ACCESS_TOKEN: z.string().min(1).describe('Polar Access Token for payment processing.'),
		POLAR_WEBHOOK_SECRET: z.string().min(1).describe('Polar webhook secret for payment verification.'),
		POLAR_TOP_UP_ID: z.string().min(1).describe('Top up product ID.'),
		PAYMENT_ETH_ADDRESS_BASE_CHAIN: z.string().min(1).describe('The Base wallet address to receive payments.'),

		// accounting
		ACTION_COST_USD: z
			.string()
			.min(1)
			.transform((s) => BigInt(s))
			.pipe(z.bigint())
			.describe('The cost of one action in USD.'),

		CHAR_PER_TOKEN: z
			.string()
			.min(1)
			.transform((value) => Number.parseInt(value, 10))
			.pipe(z.number().int())
			.describe('The number of characters per token to account for in cost prediction.'),

		COST_PREDICTION_MARGIN: z
			.string()
			.min(1)
			.transform((value) => Number.parseInt(value, 10))
			.pipe(z.number().int())
			.describe('The cost prediction margin, in percentage (e.g. "50" for 50%).'),

		MAX_HTTP_RESPONSE_BODY_BYTES: z
			.string()
			.transform((value) => Number.parseInt(value, 10))
			.pipe(z.number().int().min(1))
			.describe('Maximum HTTP response body size to store in action details (in bytes).')
			.default('819200'), // 800KiB in bytes

		// reactor
		ACTION_TIMEOUT_BUFFER_MS: z
			.string()
			.transform((value) => Number.parseInt(value, 10))
			.pipe(z.number().int().min(1_000).max(590_000))
			.describe('How much earlier than Convex hard timeout actions should abort, in milliseconds.')
			.default('120000'),

		// intelligence providers
		DEEPSEEK_API_KEY: z.string().min(1).describe('DeepSeek API key.'),
		MISTRAL_API_KEY: z.string().min(1).describe('Mistral API key.'),
		MOONSHOT_API_KEY: z.string().min(1).describe('Moonshot API key.'),
		OPENAI_API_KEY: z.string().min(1).describe('OpenAI API key.'),

		// box providers
		DAYTONA_API_KEY: z.string().min(1),
		DAYTONA_API_URL: z.string().min(1).optional().describe('Daytona control-plane base URL override.'),
		DAYTONA_TARGET: z.string().min(1).describe('Region/environment, e.g. `us` or `eu`.'),
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

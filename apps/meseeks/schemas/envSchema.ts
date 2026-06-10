import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod/v3';

export const env = createEnv({
	//
	runtimeEnv: process.env,

	server: {
		//
		SITE_URL: z.string().min(1).describe('The app public URL.'),
		ENV_TYPE: z.enum(['production', 'preview', 'development']).describe('Deployment environment.'),
		BETTER_AUTH_SECRET: z.string().min(1).describe('Better Auth application secret.'),

		POLAR_SERVER: z.enum(['sandbox', 'production']).default('sandbox').describe('Polar server.'),
		POLAR_ACCESS_TOKEN: z.string().min(1).describe('Polar Access Token for payment processing.'),
		POLAR_WEBHOOK_SECRET: z.string().min(1).describe('Polar webhook secret for payment verification.'),
		POLAR_SUBSCRIPTION_ID: z.string().min(1).describe('Pro subscription product ID.'),
		POLAR_FOUNDER_PACK_ID: z.string().min(1).describe('Founder pack product ID.'),
		POLAR_TOP_UP_ID: z.string().min(1).describe('Top up product ID.'),
		PAYMENT_ETH_ADDRESS_BASE_CHAIN: z.string().min(1).describe('The Base wallet address to receive payments.'),

		ACTION_COST_USD: z
			.string()
			.min(1)
			.transform((s) => BigInt(s))
			.pipe(z.bigint())
			.describe('The cost of one action in USD.'),

		CHAR_PER_TOKEN: z
			.string()
			.min(1)
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number())
			.describe('The number of characters per token to account for in cost prediction.'),

		COST_PREDICTION_MARGIN: z
			.string()
			.min(1)
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number())
			.describe('The cost prediction margin, in percentage (e.g. "50" for 50%).'),

		MAX_HTTP_RESPONSE_BODY_BYTES: z
			.string()
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number())
			.describe('Maximum HTTP response body size to store in action details (in bytes).')
			.default('819200'), // 800KiB in bytes

		OBJECT_STORAGE_ENDPOINT: z
			.string()
			.min(1)
			.optional()
			.describe('S3-compatible endpoint for Reactor object storage.'),
		OBJECT_STORAGE_BUCKET: z.string().min(1).optional().describe('Bucket for Reactor object storage.'),
		OBJECT_STORAGE_ACCESS_KEY_ID: z
			.string()
			.min(1)
			.optional()
			.describe('S3-compatible access key for Reactor object storage.'),
		OBJECT_STORAGE_SECRET_ACCESS_KEY: z
			.string()
			.min(1)
			.optional()
			.describe('S3-compatible secret key for Reactor object storage.'),
		OBJECT_STORAGE_REGION: z
			.string()
			.min(1)
			.optional()
			.describe('S3-compatible region for Reactor object storage.'),
		OBJECT_STORAGE_PREFIX: z
			.string()
			.optional()
			.describe('Optional Reactor object storage key prefix. Empty means bucket root.'),
		PRO_OWNER_USER_ID: z
			.string()
			.min(1)
			.optional()
			.describe('User id that owns shared public PRO loops, skills, route components, and trigger handlers.'),
		R2_ENDPOINT: z.string().min(1).optional().describe('Deprecated fallback for OBJECT_STORAGE_ENDPOINT.'),
		R2_BUCKET: z.string().min(1).optional().describe('Deprecated fallback for OBJECT_STORAGE_BUCKET.'),
		R2_ACCESS_KEY_ID: z
			.string()
			.min(1)
			.optional()
			.describe('Deprecated fallback for OBJECT_STORAGE_ACCESS_KEY_ID.'),
		R2_SECRET_ACCESS_KEY: z
			.string()
			.min(1)
			.optional()
			.describe('Deprecated fallback for OBJECT_STORAGE_SECRET_ACCESS_KEY.'),
		R2_REGION: z.string().min(1).optional().describe('Deprecated fallback for OBJECT_STORAGE_REGION.'),
		R2_PREFIX: z
			.string()
			.optional()
			.describe('Deprecated fallback for OBJECT_STORAGE_PREFIX. Empty means bucket root.'),
		MAX_REACTOR_OBJECT_READ_BYTES: z
			.string()
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number().int().min(1))
			.default('1048576')
			.describe('Maximum exact object bytes returned through the file read path.'),
		MAX_REACTOR_PARTIAL_READ_BYTES: z
			.string()
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number().int().min(1))
			.default('262144')
			.describe('Maximum object bytes fetched for partial file rendering.'),
		MAX_REACTOR_INLINE_CONTENT_BYTES: z
			.string()
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number().int().min(1))
			.default('262144')
			.describe('Maximum hot text bytes stored inline in Reactor file_contents.'),

		AUTH_GOOGLE_ID: z.string().min(1).describe('Google OAuth client ID.'),
		AUTH_GOOGLE_SECRET: z.string().min(1).describe('Google OAuth client secret.'),

		ALLOWED_DOMAINS: z
			.string()
			.min(1)
			// transform to array
			.transform((s) => s.split(','))
			// make sure transform worked
			.pipe(z.array(z.string()))
			.describe('Comma-separated list of allowed domains to sign in with.'),

		ALLOWED_EMAILS: z
			.string()
			.min(1)
			// transform to array
			.transform((s) => s.split(','))
			// make sure transform worked
			.pipe(z.array(z.string()))
			.describe('Comma-separated list of allowed emails to sign in with.'),

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

		MAX_CONSECUTIVE_COMPANION_ACTIONS: z
			.string()
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number())
			.describe('The maximum number of consecutive companion actions.')
			.default('20'),

		MAX_CONTEXT_ACTIONS: z
			.string()
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number())
			.describe('The maximum number of actions to load before token-based cropping.')
			.default('40'),

		MAX_CONTEXT_TOKENS: z
			.string()
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number().int().min(1))
			.describe('The maximum estimated tokens to keep in intelligence context.')
			.default('128000'),

		ACTION_TIMEOUT_BUFFER_MS: z
			.string()
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number().int().min(1_000).max(590_000))
			.describe('How much earlier than Convex hard timeout actions should abort, in milliseconds.')
			.default('120000'),

		ACTIVE_TASKS_RENDER_LIMIT: z
			.string()
			.transform((s) => Number.parseInt(s, 10))
			.pipe(z.number())
			.describe('Maximum number of active files to show in activeFiles variable.')
			.default('20'),

		GROQ_API_KEY: z.string().min(1).describe('Groq API key.'),
		DEEPSEEK_API_KEY: z.string().min(1).optional().describe('DeepSeek API key for Reactor DeepSeek intelligences.'),
		OPENAI_API_KEY: z
			.string()
			.min(1)
			.optional()
			.describe('OpenAI API key for Reactor stateless intelligence calls.'),
		DAYTONA_API_KEY: z.string().min(1).optional().describe('Daytona API key for Reactor sandbox execution.'),
		DAYTONA_API_URL: z.string().url().optional().describe('Daytona API URL for Reactor sandbox execution.'),
		DAYTONA_TARGET: z.string().min(1).optional().describe('Daytona target for Reactor sandbox execution.'),
		DAYTONA_IMAGE: z.string().min(1).optional().describe('Daytona image for Reactor sandbox execution.'),
		INCEPTION_API_KEY: z.string().min(1).describe('Inception Labs API key.'),
		MISTRAL_API_KEY: z.string().min(1).describe('Mistral API key.'),
		MOONSHOT_API_KEY: z.string().min(1).optional().describe('Moonshot API key for Reactor Kimi intelligences.'),

		NODE_ENV: z.enum(['development', 'production']).default('development').describe('Automatically populated.'),
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

export function objectStoragePrefix() {
	//
	// createEnv normalizes empty strings for defaults, but object storage needs to distinguish
	// an explicit empty prefix from an unset prefix because "" means bucket root.
	return (
		rawEnvValue('OBJECT_STORAGE_PREFIX') ?? rawEnvValue('R2_PREFIX') ?? env.OBJECT_STORAGE_PREFIX ?? env.R2_PREFIX
	);
}

function rawEnvValue(key: 'OBJECT_STORAGE_PREFIX' | 'R2_PREFIX') {
	//
	if (!Object.prototype.hasOwnProperty.call(process.env, key)) return undefined;

	return process.env[key] ?? '';
}

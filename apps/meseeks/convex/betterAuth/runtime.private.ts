import { type GenericCtx } from '@convex-dev/better-auth';
import { betterAuth } from 'better-auth';
import { authBasePath } from 'lib/auth';
import { createAuthOptions } from 'lib/authOptions';
import { env } from 'schemas/envSchema';
import type { DataModel } from '../_generated/dataModel';
import { betterAuthComponent } from './component';

export function createBetterAuth(ctx: GenericCtx<DataModel>) {
	//
	const authSiteUrl = getAuthSiteUrl();

	return betterAuth(
		createAuthOptions({
			baseURL: `${authSiteUrl}${authBasePath}`,
			siteUrl: authSiteUrl,
			secret: env.BETTER_AUTH_SECRET,
			googleClientId: env.AUTH_GOOGLE_ID,
			googleClientSecret: env.AUTH_GOOGLE_SECRET,
			sessionDurationSeconds: Math.floor(env.JWT_SESSION_DURATION_MS / 1000),
			sessionUpdateAgeSeconds: Math.floor(env.JWT_SESSION_UPDATE_AGE_MS / 1000),
			database: betterAuthComponent.adapter(ctx),
		}),
	);
}

function getAuthSiteUrl() {
	//
	if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
	return env.SITE_URL;
}

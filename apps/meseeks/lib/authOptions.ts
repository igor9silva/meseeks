import { convex as convexPlugin } from '@convex-dev/better-auth/plugins';
import { anonymous } from 'better-auth/plugins';
import type { AdapterFactory } from 'better-auth/adapters';
import { authBasePath } from 'lib/auth';
import authConfig from 'convex/auth.config';

type CreateAuthOptionsArgs = {
	baseURL: string;
	siteUrl: string;
	secret: string;
	googleClientId: string;
	googleClientSecret: string;
	allowAnonymousSignIn: boolean;
	sessionDurationSeconds: number;
	sessionUpdateAgeSeconds: number;
	database?: AdapterFactory;
};

const componentSiteUrl = 'https://component.invalid';

export function createAuthOptions(input: CreateAuthOptionsArgs) {
	//
	return {
		baseURL: input.baseURL,
		basePath: authBasePath,
		secret: input.secret,
		trustedOrigins: [input.siteUrl],
		...(input.database ? { database: input.database } : {}),
		session: {
			expiresIn: input.sessionDurationSeconds,
			updateAge: input.sessionUpdateAgeSeconds,
		},
		account: {
			encryptOAuthTokens: true,
		},
		advanced: {
			disableOriginCheck: input.allowAnonymousSignIn,
			cookies: {
				convex_jwt: {
					attributes: {
						// the custom convex auth bridge reads this jwt on reload so we can
						// skip better auth startup session requests in the normal case.
						httpOnly: false,
					},
				},
			},
		},
		socialProviders: {
			google: {
				clientId: input.googleClientId,
				clientSecret: input.googleClientSecret,
			},
		},
		plugins: [
			...(input.allowAnonymousSignIn ? [anonymous()] : []),
			convexPlugin({
				authConfig,
				options: {
					basePath: authBasePath,
				},
				jwt: {
					expirationSeconds: input.sessionDurationSeconds,
				},
			}),
		],
	};
}

export function createCodegenAuthOptions() {
	//
	// better auth component codegen imports this without runtime env, so it needs
	// deterministic placeholder values just to generate the local adapter types.
	// runtime session lifetime still comes from convex env in runtime.private.ts.
	return createAuthOptions({
		baseURL: `${componentSiteUrl}${authBasePath}`,
		siteUrl: componentSiteUrl,
		secret: 'component-auth-secret',
		googleClientId: 'component-google-client-id',
		googleClientSecret: 'component-google-client-secret',
		allowAnonymousSignIn: true,
		sessionDurationSeconds: 60 * 60 * 24 * 30, // 30 days
		sessionUpdateAgeSeconds: 60 * 60 * 24, // 1 day
	});
}

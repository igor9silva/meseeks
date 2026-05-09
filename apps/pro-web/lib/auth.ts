export const authBasePath = '/api/auth';
export const betterAuthCookiePrefix = 'better-auth';
export const convexJwtCookieName = 'convex_jwt';

// better auth stores secure cookies with a __Secure- prefix on https, but local
// http dev falls back to the plain prefixed cookie name.
export const convexJwtCookieNames = [
	`__Secure-${betterAuthCookiePrefix}.${convexJwtCookieName}`,
	`${betterAuthCookiePrefix}.${convexJwtCookieName}`,
];

import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start';
import { z } from 'zod/v3';

const authServerEnv = z
	.object({
		convexUrl: z.string().min(1),
		convexSiteUrl: z.string().min(1),
	})
	.parse({
		// vite owns the public convex url for both client and start server code.
		convexUrl: import.meta.env.VITE_CONVEX_URL,
		// the convex site url is server-only because this proxy forwards auth http
		// requests to the convex .site endpoint.
		convexSiteUrl: import.meta.env.VITE_CONVEX_SITE_URL,
	});

const authServer = convexBetterAuthReactStart({
	convexUrl: authServerEnv.convexUrl,
	convexSiteUrl: authServerEnv.convexSiteUrl,
});

export const handler = authServer.handler;

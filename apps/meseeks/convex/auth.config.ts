import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config';
import type { AuthConfig } from 'convex/server';
import { authBasePath } from 'lib/auth';

export default {
	providers: [getAuthConfigProvider({ basePath: authBasePath })],
} satisfies AuthConfig;

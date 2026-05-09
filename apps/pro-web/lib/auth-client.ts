import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { anonymousClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { authBasePath } from 'lib/auth';

const authClient = createAuthClient({
	basePath: authBasePath,
	plugins: [convexClient(), anonymousClient()],
});

export const signIn = authClient.signIn;
export const getConvexToken = authClient.convex.token;

export async function signOutAndReload() {
	//
	// the custom convex auth bridge only seeds itself from cookies on startup, so
	// a reload is the simplest way to guarantee immediate signed-out ui state.
	await authClient.signOut();
	window.location.reload();
}

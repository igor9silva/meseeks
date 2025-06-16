import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexQueryClient } from '@convex-dev/react-query';
import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routerWithQueryClient } from '@tanstack/react-router-with-query';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

import { CommandMenuProvider } from '~/components/CommandMenu';
import { Loading } from '~/components/Loading';
import { ThemeProvider } from '~/components/ThemeProvider';
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary';
import { NotFound } from './components/NotFound';
import { routeTree } from './routeTree.gen';

export function createRouter() {
	//
	const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL as string;
	if (!CONVEX_URL) throw new Error('missing VITE_CONVEX_URL envar');

	const convex = new ConvexReactClient(CONVEX_URL, {
		unsavedChangesWarning: false,
		verbose: true,
		authRefreshTokenLeewaySeconds: 60,
	});

	const convexQueryClient = new ConvexQueryClient(convex);
	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
	});

	convexQueryClient.connect(queryClient);

	const router = routerWithQueryClient(
		createTanStackRouter({
			routeTree,
			scrollRestoration: true,
			defaultViewTransition: true,
			defaultPreload: 'intent',
			defaultPreloadDelay: 50, // 50ms is the default, just making it explicit here
			defaultPreloadStaleTime: 0, // 0 so we don't cache at the loader level, leaving it all to TanStack Query
			defaultPendingComponent: Loading,
			defaultErrorComponent: DefaultCatchBoundary,
			defaultNotFoundComponent: () => <NotFound />,
			context: { queryClient },
			Wrap: ({ children }) => {
				return (
					<ConvexProvider client={convexQueryClient.convexClient}>
						<ConvexAuthProvider client={convexQueryClient.convexClient}>
							<ThemeProvider>
								<CommandMenuProvider>{children}</CommandMenuProvider>
							</ThemeProvider>
						</ConvexAuthProvider>
					</ConvexProvider>
				);
			},
		}),
		queryClient,
	);

	return router;
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof createRouter>;
	}
}

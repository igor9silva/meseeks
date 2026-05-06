import { ConvexQueryClient } from '@convex-dev/react-query';
import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { ConvexAuthProvider } from '~/components/ConvexAuthProvider';
import { LauncherProvider } from '~/components/Launcher';
import { Loading } from '~/components/Loading';
import { ThemeProvider } from '~/components/ThemeProvider';
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary';
import { NotFound } from './components/NotFound';
import { routeTree } from './routeTree.gen';

export function createRouter() {
	//
	const { VITE_CONVEX_URL } = import.meta.env;
	if (!VITE_CONVEX_URL) throw new Error('missing VITE_CONVEX_URL envar');

	const convexQueryClient = new ConvexQueryClient(VITE_CONVEX_URL, {
		verbose: false,
		unsavedChangesWarning: true,
		authRefreshTokenLeewaySeconds: 60,
	});

	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
	});

	convexQueryClient.connect(queryClient);

	const router = createTanStackRouter({
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
				<ConvexAuthProvider client={convexQueryClient.convexClient}>
					<ThemeProvider>
						<LauncherProvider>{children}</LauncherProvider>
					</ThemeProvider>
				</ConvexAuthProvider>
			);
		},
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient,
	});

	return router;
}

export async function getRouter() {
	//
	return createRouter();
}

declare module '@tanstack/react-router' {
	interface Register {
		router: Awaited<ReturnType<typeof getRouter>>;
	}
}

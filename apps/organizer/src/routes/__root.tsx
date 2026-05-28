import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import TanStackQueryDevtools from '~/integrations/tanstack-query/devtools';
import TanStackQueryProvider from '~/integrations/tanstack-query/root-provider';
import appCss from '~/styles.css?url';

interface RouterContext {
	queryClient: QueryClient;
}

// react-doctor-disable-next-line react-doctor/only-export-components -- TanStack Router file routes must export Route.
export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'Organizer' },
		],
		links: [
			{ rel: 'stylesheet', href: appCss },
			{ rel: 'icon', href: '/favicon.ico' },
		],
	}),
	notFoundComponent: RootNotFoundComponent,
	component: RootComponent,
});

export function RootComponent() {
	//
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

export function RootNotFoundComponent() {
	//
	return <div className="p-6 text-sm text-muted-foreground">Page not found.</div>;
}

export function RootDocument({ children }: { children: React.ReactNode }) {
	//
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<style>{`
					:root { color-scheme: dark; }
					html, body { background: #09090b; color: #fafafa; }
				`}</style>
			</head>
			<body className="bg-background text-foreground">
				<TanStackQueryProvider>
					{children}
					<TanStackDevtools
						config={{ position: 'bottom-right' }}
						plugins={[
							{
								name: 'TanStack Router',
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				</TanStackQueryProvider>
				<Scripts />
			</body>
		</html>
	);
}

import { useAuthActions } from '@convex-dev/auth/react';
import { QueryClient } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react';
import * as React from 'react';
import { CommandMenuDialog } from '~/components/CommandMenu';
import { FeedbackDialog } from '~/components/FeedbackDialog';
import { Loading } from '~/components/Loading';
import { MainHeader } from '~/components/MainHeader';
import { RotatingLoadingMessage } from '~/components/RotatingLoadingMessage';
import { ScheduleIterationDialog } from '~/components/ScheduleIterationDialog';
import { Button } from '~/components/ui/button';
import { Toaster } from '~/components/ui/sonner';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { FeedbackDialogProvider, useFeedbackDialog } from '~/hooks/useFeedbackDialog';
import { ScheduleDialogProvider, useScheduleDialog } from '~/hooks/useScheduleDialog';
import { seo } from '~/lib/seo';

import appCss from '~/styles/app.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
	head: () => ({
		meta: [
			{ title: 'Meseeks' },
			{ charSet: 'utf-8' },
			{
				name: 'viewport',
				content: [
					'width=device-width',
					'initial-scale=1',
					'minimum-scale=1',
					'maximum-scale=1',
					'user-scalable=no',
					'viewport-fit=cover',
				].join(','),
			},
			...seo({
				title: 'Meseeks',
				description: `Open platform to amplify yourself — be free. Open source, data and business. Research preview.`,
				image: '/og.webp',
			}),
		],
		links: [
			{ rel: 'stylesheet', href: appCss },

			// Favicon
			{ rel: 'icon', href: '/static/favicon-dark.ico', media: '(prefers-color-scheme: dark)' },
			{ rel: 'icon', href: '/static/favicon-light.ico', media: '(prefers-color-scheme: light)' },

			{ name: 'application-name', content: 'Meseeks' },
			{ name: 'apple-mobile-web-app-title', content: 'Meseeks' },

			// PWA Manifest
			{ rel: 'manifest', href: '/static/site.webmanifest' },

			// Theme Color
			{ name: 'theme-color', content: '#000000', media: '(prefers-color-scheme: dark)' },
			{ name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },

			// Full screen mode
			{ name: 'mobile-web-app-capable', content: 'yes' },
			{ name: 'apple-mobile-web-app-capable', content: 'yes' },

			// Styling
			{ name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
			{ rel: 'apple-touch-icon', sizes: '180x180', href: '/static/logo-dark-192.png' },
		],
		scripts: [
			{
				'src': 'https://cloud.umami.is/script.js',
				'data-website-id': '52e8f61f-df67-4fe9-9e17-c6b979892db7',
			},
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
			{/* <TanStackRouterDevtools position="bottom-right" />
			<ReactQueryDevtools /> */}
		</RootDocument>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html className="overflow-hidden">
			<head>
				<HeadContent />
			</head>
			<body>
				<RootLayout>{children}</RootLayout>
				<Scripts />
				<SpeedInsights />
				<Analytics debug={false} />
			</body>
		</html>
	);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	//
	return (
		<div>
			<AuthLoading>
				<Loading className="h-svh" />
			</AuthLoading>
			<Unauthenticated>
				<AccessDenied />
			</Unauthenticated>
			<Authenticated>
				<Main>{children}</Main>
			</Authenticated>
		</div>
	);
}

function Main({ children }: { children: React.ReactNode }) {
	//
	const user = useCurrentUser();

	if (!user.isReady) return <RotatingLoadingMessage />;

	return (
		<FeedbackDialogProvider>
			<ScheduleDialogProvider>
				<MainWithFeedback>{children}</MainWithFeedback>
			</ScheduleDialogProvider>
		</FeedbackDialogProvider>
	);
}

function MainWithFeedback({ children }: { children: React.ReactNode }) {
	//
	const feedbackDialog = useFeedbackDialog();
	const scheduleDialog = useScheduleDialog();
	const toggleFeedback = (isOpen: boolean) => (isOpen ? feedbackDialog.open() : feedbackDialog.close());
	const toggleSchedule = (isOpen: boolean) => (isOpen ? undefined : scheduleDialog.close());

	return (
		<div className="flex h-svh w-full">
			{/* <div className="hidden md:block">
				<MainSidebar />
			</div> */}
			<main className="flex-1 flex flex-col-reverse md:flex-col overflow-hidden p-1 pb-3 md:p-0">
				<MainHeader className="mt-0" />
				<div className="flex-1 overflow-auto">{children}</div>
			</main>
			<Toaster position="top-right" richColors />
			<CommandMenuDialog />
			<FeedbackDialog open={feedbackDialog.isOpen} onOpenChange={toggleFeedback} />
			{scheduleDialog.taskId && (
				<ScheduleIterationDialog
					taskId={scheduleDialog.taskId}
					open={scheduleDialog.isOpen}
					onOpenChange={toggleSchedule}
				/>
			)}
		</div>
	);
}

function AccessDenied() {
	//
	const { signIn } = useAuthActions();

	return (
		<div className="h-screen w-full flex flex-col items-center justify-center gap-4">
			<Button onClick={() => signIn('google', { redirectTo: location.href })}>Continue with Google</Button>
			<footer className="absolute bottom-4 text-sm text-muted-foreground flex gap-4">
				<a
					href="/static/privacy-policy.md"
					className="hover:underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Privacy Policy
				</a>
				<span>•</span>
				<a
					href="https://github.com/igor9silva/meseeks"
					className="hover:underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					GitHub
				</a>
			</footer>
		</div>
	);
}

// TODO: on .webmanifest:
// show on chrome install
// "screenshots": [
//   {
//     "src": "screenshots/home.png",
//     "sizes": "1280x720",
//     "type": "image/png"
//   },
//   {
//     "src": "screenshots/settings.png",
//     "sizes": "1280x720",
//     "type": "image/png"
//   }
// ]

// SEO
// "categories": ["productivity", "utilities", "ai"]

// Define quick actions for users via long-press on the app icon (on supported devices).
// "shortcuts": [
//   {
//     "name": "New Task",
//     "short_name": "Task",
//     "description": "Create a new task instantly",
//     "url": "/new-task",
//     "icons": [{ "src": "icons/shortcut-task.png", "sizes": "192x192" }]
//   }
// ]

// other
// •	share_target: Lets your PWA receive shared content.
// •	protocol_handlers: Registers your app to handle custom URI schemes.
// •	file_handlers: Allows your PWA to open or handle specific file types.
// •	display_override: Overrides the display property with a fallback sequence.
// •	capture_links: Specifies how links to your domain should open (e.g., in-app).
// •	launch_handler: Manages how the app launches if it's already open.
// •	prefer_related_applications and related_applications: Suggests native apps related to your PWA.
// •	iarc_rating_id: International Age Rating Coalition identifier for store listings.

// TODO: add SEO Tags, e.g. from TanStack
//     { title },
//     { name: 'description', content: description },
//     { name: 'keywords', content: keywords },
//     { name: 'twitter:title', content: title },
//     { name: 'twitter:description', content: description },
//     { name: 'twitter:creator', content: '@tannerlinsley' },
//     { name: 'twitter:site', content: '@tannerlinsley' },
//     { name: 'og:type', content: 'website' },
//     { name: 'og:title', content: title },
//     { name: 'og:description', content: description },
//     ...(image
//       ? [
//           { name: 'twitter:image', content: image },
//           { name: 'twitter:card', content: 'summary_large_image' },
//           { name: 'og:image', content: image },
//         ]
//       : []),

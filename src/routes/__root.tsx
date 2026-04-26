import { QueryClient } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useLocation } from '@tanstack/react-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react';
import { AccessDenied } from '~/components/AccessDenied';
import { LauncherDialog } from '~/components/Launcher';
import { FeedbackDialog } from '~/components/FeedbackDialog';
import { Loading } from '~/components/Loading';
import { MainHeader } from '~/components/MainHeader';
import { RotatingLoadingMessage } from '~/components/RotatingLoadingMessage';
import { ScheduleIterationDialog } from '~/components/ScheduleIterationDialog';
import { Toaster } from '~/components/ui/sonner';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { FeedbackDialogProvider, useFeedbackDialog } from '~/hooks/useFeedbackDialog';
import { ScheduleDialogProvider, useScheduleDialog } from '~/hooks/useScheduleDialog';
import { seo } from '~/lib/seo';
import {
	baseThemeCssText,
	defaultDarkThemeColor,
	defaultLightThemeColor,
	getRootDocumentTheme,
	getThemeInitScript,
} from '~/lib/themes/document';

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

			{ name: 'application-name', content: 'Meseeks' },
			{ name: 'apple-mobile-web-app-title', content: 'Meseeks' },
			{ name: 'theme-color', content: defaultDarkThemeColor, media: '(prefers-color-scheme: dark)' },
			{ name: 'theme-color', content: defaultLightThemeColor, media: '(prefers-color-scheme: light)' },
			{ name: 'mobile-web-app-capable', content: 'yes' },
			{ name: 'apple-mobile-web-app-capable', content: 'yes' },
			{ name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
		],
		links: [
			{ rel: 'stylesheet', href: appCss },

			// Favicon
			{ rel: 'icon', href: '/static/favicon-dark.ico', media: '(prefers-color-scheme: dark)' },
			{ rel: 'icon', href: '/static/favicon-light.ico', media: '(prefers-color-scheme: light)' },

			// PWA Manifest
			{ rel: 'manifest', href: '/static/site.webmanifest' },

			// Styling
			{ rel: 'apple-touch-icon', sizes: '180x180', href: '/static/logo-dark-192.png' },
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
	//
	const rootDocumentTheme = getRootDocumentTheme();

	return (
		<html
			className={rootDocumentTheme.htmlClassName}
			data-theme={rootDocumentTheme.themeId}
			data-theme-source={rootDocumentTheme.themeSource}
		>
			<head>
				{/**
				 * The server does not know the signed-in user's saved theme here. We inline the system fallback CSS, then a tiny prepaint script applies the active saved theme snapshot before React hydrates.
				 */}
				<style>{baseThemeCssText}</style>
				<script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
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
	const { pathname } = useLocation();
	const isShareRoute = pathname.startsWith('/share/');

	if (isShareRoute) {
		return <div className="h-dvh w-full">{children}</div>;
	}

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
			<Toaster position="top-right" />
			<LauncherDialog />
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

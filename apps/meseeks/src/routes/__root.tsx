import { QueryClient } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useLocation } from '@tanstack/react-router';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react';
import { AccessDenied } from '~/components/AccessDenied';
import { FeedbackDialog } from '~/components/FeedbackDialog';
import { LauncherDialog, LauncherProvider } from '~/components/Launcher';
import { Loading } from '~/components/Loading';
import { MainHeader } from '~/components/MainHeader';
import { RotatingLoadingMessage } from '~/components/RotatingLoadingMessage';
import { Toaster } from '~/components/ui/sonner';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { FeedbackDialogProvider, useFeedbackDialog } from '~/hooks/useFeedbackDialog';
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
			{ title: 'PRO' },
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
				title: 'PRO',
				description: 'your Personal Relentless Operator.',
				image: '/og.webp',
			}),

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
	const { pathname } = useLocation();
	const pwa = getPwaConfig(pathname);

	return (
		<html
			lang="en"
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
				<meta name="application-name" content={pwa.title} />
				<meta name="apple-mobile-web-app-title" content={pwa.title} />
				<link rel="manifest" href={pwa.manifestHref} />
				<HeadContent />
			</head>
			<body>
				<RootLayout>{children}</RootLayout>
				<Scripts />
				<SpeedInsights />
			</body>
		</html>
	);
}

function getPwaConfig(pathname: string) {
	if (pathname === '/translate') {
		return {
			title: 'Translate',
			manifestHref: '/static/translate.webmanifest',
		};
	}

	return {
		title: 'PRO',
		manifestHref: '/static/site.webmanifest',
	};
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
			<LauncherProvider>
				<MainWithFeedback>{children}</MainWithFeedback>
			</LauncherProvider>
		</FeedbackDialogProvider>
	);
}

function MainWithFeedback({ children }: { children: React.ReactNode }) {
	//
	const feedbackDialog = useFeedbackDialog();
	const toggleFeedback = (isOpen: boolean) => (isOpen ? feedbackDialog.open() : feedbackDialog.close());

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
//     "name": "New File",
//     "short_name": "File",
//     "description": "Create a new file instantly",
//     "url": "/new",
//     "icons": [{ "src": "icons/shortcut-file.png", "sizes": "192x192" }]
//   }
// ]

// other
// - share_target: lets your PWA receive shared content.
// - protocol_handlers: registers your app to handle custom URI schemes.
// - file_handlers: allows your PWA to open or handle specific file types.
// - display_override: overrides the display property with a fallback sequence.
// - capture_links: specifies how links to your domain should open, e.g. in-app.
// - launch_handler: manages how the app launches if it's already open.
// - prefer_related_applications and related_applications: suggests native apps related to your PWA.
// - iarc_rating_id: international age rating coalition identifier for store listings.

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

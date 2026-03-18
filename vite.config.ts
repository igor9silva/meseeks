import mdx from '@mdx-js/rollup';
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	server: {
		strictPort: true,
	},
	ssr: {
		// don't externalize these packages during ssr; vite needs to transform the react-start entry instead of leaving node to resolve it raw.
		// zod must stay bundled too, because the vercel function hoists top-level `zod` to 4.x via better-auth and breaks bare `zod/v3` runtime imports.
		noExternal: ['@convex-dev/better-auth', 'zod'],
	},
	plugins: [
		tanstackStart(),
		nitroV2Plugin({
			// nitro's unimport scan trips on bundled server chunks here and injects h3 helpers
			// like `getSession`, which collides with the existing bundle output during vercel builds.
			imports: false,
			compatibilityDate: '2026-03-16',
		}), // installing 'nitro' brings v3 alpha, which breaks
		tsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		react({
			babel: {
				plugins: ['babel-plugin-react-compiler'],
			},
		}),
		mdx(),
		sentryVitePlugin({
			org: 'ispro',
			project: 'meseeks',
			release: {
				name: process.env['VERCEL_GIT_COMMIT_SHA'] || 'development',
				inject: true, // injects release info into the bundle
			},
		}),
	],
	build: {
		sourcemap: true,
	},
	esbuild: {
		target: 'es2022',
	},
});

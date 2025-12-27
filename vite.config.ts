import mdx from '@mdx-js/rollup';
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [
		tanstackStart(),
		nitroV2Plugin(), // installing 'nitro' brings v3 alpha, which breaks
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

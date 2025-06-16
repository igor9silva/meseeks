import mdx from '@mdx-js/rollup';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [
		tsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		mdx(),
		sentryVitePlugin({
			org: 'ispro',
			project: 'meseeks',
		}),
		tanstackStart({
			target: 'vercel',
			tsr: {
				// @ts-expect-error - autoCodeSplitting exists but may be in newer types
				autoCodeSplitting: true,
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

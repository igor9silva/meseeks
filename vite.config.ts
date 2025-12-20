import mdx from '@mdx-js/rollup';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [
		tanstackStart(),
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
		}),
	],
	build: {
		sourcemap: true,
	},
	esbuild: {
		target: 'es2022',
	},
});

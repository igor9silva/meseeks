import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const organizerDevtoolsEventBusPort = Number(process.env.ORGANIZER_DEVTOOLS_EVENT_BUS_PORT ?? 42070);
const organizerDevServerIgnoredPaths = ['**/.output/**'];
const vscodeLspProtocolEntry = fileURLToPath(
	new URL('../../node_modules/.bun/node_modules/vscode-languageserver-protocol/lib/browser/main.js', import.meta.url),
);
const vscodeJsonRpcBrowserEntry = fileURLToPath(
	new URL('../../node_modules/.bun/node_modules/vscode-jsonrpc/lib/browser/main.js', import.meta.url),
);
const vscodeJsonRpcRoot = fileURLToPath(
	new URL('../../node_modules/.bun/node_modules/vscode-jsonrpc', import.meta.url),
);
const vscodeLspTypesEntry = fileURLToPath(
	new URL('../../node_modules/.bun/node_modules/vscode-languageserver-types/lib/esm/main.js', import.meta.url),
);

const config = defineConfig({
	plugins: [
		// keep organizer devtools off the root app's default event-bus port
		devtools({ eventBusConfig: { port: organizerDevtoolsEventBusPort } }),
		nitroV2Plugin(),
		tsconfigPaths({ projects: ['./tsconfig.json'] }),
		tailwindcss(),
		tanstackStart(),
		viteReact({
			babel: {
				plugins: ['babel-plugin-react-compiler'],
			},
		}),
	],
	// Mermaid pulls Langium; let Vite serve it directly instead of esbuild prebundling it.
	optimizeDeps: {
		exclude: ['mermaid'],
	},
	resolve: {
		alias: [
			// langium is loaded through mermaid and Bun's linked cache can hide this bare dependency from Rollup.
			{ find: /^vscode-languageserver-protocol$/, replacement: vscodeLspProtocolEntry },
			{ find: /^vscode-jsonrpc\/browser$/, replacement: vscodeJsonRpcBrowserEntry },
			{ find: /^vscode-jsonrpc\/(.*)$/, replacement: `${vscodeJsonRpcRoot}/$1` },
			{ find: /^vscode-languageserver-types$/, replacement: vscodeLspTypesEntry },
		],
	},
	server: {
		watch: {
			// production builds are large enough to trip macos watcher limits here
			ignored: organizerDevServerIgnoredPaths,
		},
	},
});

export default config;

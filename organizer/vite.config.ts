import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const organizerDevtoolsEventBusPort = 42070;
const organizerDevServerIgnoredPaths = ["**/.output/**"];

const config = defineConfig({
	plugins: [
		// keep organizer devtools off the root app's default event-bus port
		devtools({ eventBusConfig: { port: organizerDevtoolsEventBusPort } }),
		nitro(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
	],
	server: {
		watch: {
			// production builds are large enough to trip macos watcher limits here
			ignored: organizerDevServerIgnoredPaths,
		},
	},
});

export default config;

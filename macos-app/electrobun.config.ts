import type { ElectrobunConfig } from "electrobun";

const config: ElectrobunConfig = {
	app: {
		name: "Local Workbench",
		identifier: "dev.localworkbench.app",
		version: "0.1.0",
		description: "macOS-native local coding shell built with Electrobun and code-server.",
	},
	build: {
		buildFolder: "build",
		artifactFolder: "artifacts",
		targets: "current",
		bun: {
			entrypoint: "src/bun/index.ts",
			sourcemap: "inline",
		},
		mac: {
			defaultRenderer: "native",
		},
	},
};

export default config;

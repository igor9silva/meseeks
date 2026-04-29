#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
	existsSync,
	readdirSync,
	readlinkSync,
	rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const projectRoot = process.cwd();
const codeServerRoot = join(projectRoot, "node_modules", "code-server");
const vscodeNodeModules = join(codeServerRoot, "lib", "vscode", "node_modules");
const vscodeExtensionsNodeModules = join(
	codeServerRoot,
	"lib",
	"vscode",
	"extensions",
	"node_modules",
);

if (!existsSync(codeServerRoot)) {
	console.error('Missing code-server. Run "bun install" first.');
	process.exit(1);
}

if (!existsSync(vscodeNodeModules) || !existsSync(vscodeExtensionsNodeModules)) {
	console.log("Preparing embedded code-server runtime...");
	execFileSync("sh", ["./postinstall.sh"], {
		cwd: codeServerRoot,
		stdio: "inherit",
		env: {
			...process.env,
			npm_config_user_agent:
				process.env.npm_config_user_agent ||
				"npm/10.9.0 node/v22.6.0 darwin arm64 workspaces/false",
			npm_config_unsafe_perm: "true",
		},
	});
}

const removed = pruneBrokenSymlinks(codeServerRoot);
if (removed.length) {
	console.log("Removed broken symlinks:");
	for (const entry of removed) {
		console.log(`- ${entry}`);
	}
}

function pruneBrokenSymlinks(rootPath) {
	const removedEntries = [];

	visit(rootPath);
	return removedEntries;

	function visit(currentPath) {
		for (const dirent of readdirSync(currentPath, { withFileTypes: true })) {
			const entryPath = join(currentPath, dirent.name);

			if (dirent.isDirectory()) {
				visit(entryPath);
				continue;
			}

			if (!dirent.isSymbolicLink()) {
				continue;
			}

			const linkTarget = readlinkSync(entryPath);
			const resolvedTarget = resolve(dirname(entryPath), linkTarget);

			if (existsSync(resolvedTarget)) {
				continue;
			}

			rmSync(entryPath, { force: true });
			removedEntries.push(entryPath);
		}
	}
}

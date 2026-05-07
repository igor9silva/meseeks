#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
	cpSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	symlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import process from "node:process";

const buildEnvironment = process.argv[2];
const supportedBuildEnvironments = new Set(["dev", "stable"]);

if (!supportedBuildEnvironments.has(buildEnvironment)) {
	console.error('Usage: node scripts/stage-runtime.mjs <dev|stable>');
	process.exit(1);
}

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();
const buildArch =
	process.arch === "arm64"
		? "arm64"
		: process.arch === "x64"
			? "x64"
			: null;

if (!buildArch) {
	console.error(`Unsupported macOS architecture: ${process.arch}`);
	process.exit(1);
}

const appBundleName =
	buildEnvironment === "dev"
		? "Mecode MVP-dev.app"
		: "Mecode MVP.app";
const appBundleDir = join(
	projectRoot,
	"build",
	`${buildEnvironment}-macos-${buildArch}`,
	appBundleName,
);
const appResourcesDir = join(
	appBundleDir,
	"Contents",
	"Resources",
	"app",
);
const stableOuterResourcesDir = join(appBundleDir, "Contents", "Resources");
const targetNodeModulesDir = join(appResourcesDir, "node_modules");
const sourcePackageJson = join(projectRoot, "package.json");
const targetPackageJson = join(appResourcesDir, "package.json");
const sourceNodeModulesDir = findNodeModulesAncestor(packageRoot("code-server"));
const artifactDir = join(projectRoot, "artifacts");
const stableArtifactPrefix = `stable-macos-${buildArch}-`;
const zstdBinary = join(
	packageRoot("electrobun"),
	buildArch === "arm64" ? "dist-macos-arm64" : "dist-macos-x64",
	"zig-zstd",
);
const tarEnvironment = {
	...process.env,
	COPYFILE_DISABLE: "1",
	COPY_EXTENDED_ATTRIBUTES_DISABLE: "1",
};

if (!existsSync(appBundleDir)) {
	console.error(`Missing app bundle directory at ${appBundleDir}`);
	process.exit(1);
}

if (buildEnvironment === "stable") {
	stageStableRuntime();
} else {
	stageRuntimeTree(appResourcesDir, "symlink");
}

console.log(`Staged runtime into ${appBundleDir}`);

function stageStableRuntime() {
	const payloadArchivePath = findStablePayloadArchive(stableOuterResourcesDir);
	const tempRoot = mkdtempSync(join(tmpdir(), "local-workbench-stable-"));
	const unpackedTarPath = join(tempRoot, "payload.tar");
	const extractedRoot = join(tempRoot, "extracted");
	const extractedAppResourcesDir = join(
		extractedRoot,
		appBundleName,
		"Contents",
		"Resources",
		"app",
	);

	mkdirSync(extractedRoot, { recursive: true });

	try {
		execFileSync(
			zstdBinary,
			["decompress", "-i", payloadArchivePath, "-o", unpackedTarPath, "--no-timing"],
			{ stdio: "inherit" },
		);
		execFileSync("tar", ["-xf", unpackedTarPath, "-C", extractedRoot], {
			stdio: "inherit",
			env: tarEnvironment,
		});
		stageRuntimeTree(extractedAppResourcesDir, "copy");
		pruneAppleDoubleEntries(extractedRoot);
		rmSync(unpackedTarPath, { force: true });
		execFileSync("tar", ["-cf", unpackedTarPath, "-C", extractedRoot, appBundleName], {
			stdio: "inherit",
			env: tarEnvironment,
		});
		rmSync(payloadArchivePath, { force: true });
		execFileSync(
			zstdBinary,
			[
				"compress",
				"-i",
				unpackedTarPath,
				"-o",
				payloadArchivePath,
				"-l",
				"6",
				"--no-timing",
			],
			{ stdio: "inherit" },
		);
		removeStaleStableArtifacts();
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
}

function findStablePayloadArchive(resourcesDir) {
	const payloadArchiveName = readdirSync(resourcesDir).find((entry) =>
		entry.endsWith(".tar.zst"),
	);

	if (!payloadArchiveName) {
		console.error(`Missing stable payload archive in ${resourcesDir}`);
		process.exit(1);
	}

	return join(resourcesDir, payloadArchiveName);
}

function stageRuntimeTree(targetResourcesDir, mode) {
	const runtimeNodeModulesDir = join(targetResourcesDir, "node_modules");
	const runtimePackageJson = join(targetResourcesDir, "package.json");

	mkdirSync(targetResourcesDir, { recursive: true });
	rmSync(runtimeNodeModulesDir, { recursive: true, force: true });
	rmSync(runtimePackageJson, { force: true });

	if (mode === "copy") {
		cpSync(sourceNodeModulesDir, runtimeNodeModulesDir, {
			recursive: true,
			verbatimSymlinks: true,
		});
		try {
			execFileSync("xattr", ["-cr", targetResourcesDir], {
				stdio: "ignore",
			});
		} catch {}
		pruneAppleDoubleEntries(targetResourcesDir);
	} else {
		symlinkSync(
			relative(targetResourcesDir, sourceNodeModulesDir),
			runtimeNodeModulesDir,
			"dir",
		);
	}

	copyFileSync(sourcePackageJson, runtimePackageJson);
}

function pruneAppleDoubleEntries(rootDir) {
	for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
		const entryPath = join(rootDir, entry.name);

		if (entry.name.startsWith("._")) {
			rmSync(entryPath, { recursive: true, force: true });
			continue;
		}

		if (entry.isDirectory()) {
			pruneAppleDoubleEntries(entryPath);
		}
	}
}

function removeStaleStableArtifacts() {
	if (!existsSync(artifactDir)) {
		return;
	}

	for (const entry of readdirSync(artifactDir)) {
		if (!entry.startsWith(stableArtifactPrefix)) {
			continue;
		}

		rmSync(join(artifactDir, entry), { recursive: true, force: true });
	}
}

function packageRoot(packageName) {
	try {
		return dirname(require.resolve(`${packageName}/package.json`));
	} catch {
		console.error(`Missing ${packageName}. Run "bun install" first.`);
		process.exit(1);
	}
}

function findNodeModulesAncestor(startPath) {
	let currentPath = startPath;

	while (currentPath !== dirname(currentPath)) {
		if (basename(currentPath) === "node_modules") {
			return currentPath;
		}

		currentPath = dirname(currentPath);
	}

	console.error(`Unable to locate node_modules for ${startPath}`);
	process.exit(1);
}

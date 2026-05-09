import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

// This script is intentionally app-local. Convex resolves project config from the
// current directory, so running from the repo root would target the wrong shape.
const appPackageName = '@meseeks/app';

// Keep the intermediate file predictable so it can be inspected when the sync
// gets more complicated, but never commit it: it contains copied secret values.
const envFile = '.env.convex.dev';

// We are maintaining the project-level defaults used by freshly-created Convex
// preview deployments, not a single already-created preview deployment.
const targetType = 'preview';

// The app currently pins an older Convex runtime package. The default-env CLI is
// newer than that runtime package, so use the latest CLI by default without
// changing the runtime dependency used by app code.
const convexCliPackage = process.env.CONVEX_CLI_PACKAGE ?? 'convex@latest';

// Preview deployments mostly inherit development values today, with a small set
// of intentional differences. Keep those differences in one object so future
// preview-specific values can be added without changing the rewrite flow.
const previewOverrides = {
	ENV_TYPE: 'preview',
} satisfies Record<string, string>;

function main() {
	assertAppRoot();

	// Convex prints env vars in dotenv format already. Capture stdout instead of
	// shell-redirecting so this script works the same in local shells and CI.
	console.log(`Reading current Convex environment variables into ${envFile}`);
	const devEnv = runConvex(['env', 'list'], 'capture');
	const previewEnv = applyPreviewOverrides(devEnv);

	// `mode` only applies when the file is created. chmod after writing as well
	// so repeated runs keep the copied secrets readable only by this user.
	writeFileSync(envFile, previewEnv, { encoding: 'utf8', mode: 0o600 });
	chmodSync(envFile, 0o600);

	console.log(`Applying preview overrides: ${Object.keys(previewOverrides).join(', ')}`);
	console.log(`Setting default ${targetType} Convex environment variables with --force`);

	// `env default set` updates the template used for future deployments. `--force`
	// is expected here because this script is the source of truth for defaults.
	runConvex(['env', 'default', 'set', '--type', targetType, '--from-file', envFile, '--force']);

	console.log(`Synced ${envFile} to default ${targetType} Convex environment variables.`);
}

function assertAppRoot() {
	// A lightweight guard catches the common mistake: running from the workspace
	// root because most other commands are invoked as `bun --cwd apps/meseeks`.
	if (!existsSync('package.json') || !existsSync('convex.json')) {
		throw new Error('Run this from apps/meseeks.');
	}

	const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { name?: string };

	// The package name is the final check that this is the main app, not another
	// workspace that happens to have a Convex config later.
	if (packageJson.name !== appPackageName) {
		throw new Error('Run this from apps/meseeks.');
	}
}

function runConvex(args: string[], mode: 'capture' | 'inherit' = 'inherit') {
	// Use bunx here instead of the package script's local `convex` binary so the
	// CLI version can move independently from the app runtime dependency.
	const result = spawnSync('bunx', [convexCliPackage, ...args], {
		encoding: 'utf8',
		// Capture only commands whose stdout is data we need to rewrite. All other
		// commands inherit stdio so Convex prompts/errors stay visible.
		stdio: mode === 'capture' ? ['inherit', 'pipe', 'inherit'] : 'inherit',
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		const command = ['bunx', convexCliPackage, ...args].join(' ');
		throw new Error(`${command} failed with exit code ${result.status ?? 1}.`);
	}

	return typeof result.stdout === 'string' ? result.stdout : '';
}

function applyPreviewOverrides(contents: string) {
	// Convex's `env list` output is dotenv-like text, not JSON. Preserve unknown
	// lines so comments/formatting from future CLI output are not accidentally
	// discarded while we surgically replace only keys we own.
	const body = contents.trimEnd();
	const lines = body.length > 0 ? body.split(/\r?\n/) : [];
	const seenOverrides = new Set<string>();
	const nextLines: string[] = [];

	for (const line of lines) {
		const key = parseEnvKey(line);
		const override = key ? getPreviewOverride(key) : undefined;

		if (key && override !== undefined) {
			// If the source file ever has duplicate keys, keep the first overridden
			// value and drop later duplicates. That gives Convex one clear default.
			if (!seenOverrides.has(key)) {
				nextLines.push(`${key}=${formatDotenvValue(override)}`);
				seenOverrides.add(key);
			}

			continue;
		}

		nextLines.push(line);
	}

	// Add preview-only defaults even when the development deployment does not have
	// the key yet. This is what lets ENV_TYPE diverge cleanly for previews.
	for (const [key, value] of Object.entries(previewOverrides)) {
		if (!seenOverrides.has(key)) {
			nextLines.push(`${key}=${formatDotenvValue(value)}`);
		}
	}

	// Keep a trailing newline so the generated file behaves well with CLIs,
	// editors, and future diffs if we ever inspect it manually.
	return `${nextLines.join('\n')}\n`;
}

function parseEnvKey(line: string) {
	// Accept plain dotenv lines plus `export KEY=value`; ignore blank lines,
	// comments, malformed lines, and values that merely contain equals signs.
	const match = line.match(/^\s*(?:export\s+)?([A-Za-z][A-Za-z0-9_]*)\s*=/);
	return match?.[1];
}

function getPreviewOverride(key: string) {
	// Avoid indexing inherited properties. Env names are external text, so keep
	// the lookup explicit even though the current override object is tiny.
	if (Object.prototype.hasOwnProperty.call(previewOverrides, key)) {
		return previewOverrides[key as keyof typeof previewOverrides];
	}

	return undefined;
}

function formatDotenvValue(value: string) {
	// Keep simple values readable. Quote only when dotenv parsing could be
	// ambiguous because of spaces, quotes, or shell-significant characters.
	if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) {
		return value;
	}

	return JSON.stringify(value);
}

try {
	main();
} catch (error) {
	// Keep failures compact for CI logs while preserving the real Convex output
	// from inherited stdio above.
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

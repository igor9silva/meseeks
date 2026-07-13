import { spawnSync } from 'node:child_process';
import { chmodSync, writeFileSync } from 'node:fs';
import { assertAppRoot, envLocalFile, loadEnvLocal, previewObjectStoragePrefix } from './preview-env';

// Keep the intermediate file predictable so it can be inspected when the sync
// gets more complicated, but never commit it: it contains copied secret values.
const envFile = '.env.convex.dev';
const args = process.argv.slice(2);

// We are maintaining the project-level defaults used by freshly-created Convex
// preview deployments and, when available, the currently selected preview too.
const targetType = 'preview';

// Preview deployments mostly inherit development values today, with a small set
// of intentional differences. Keep those differences in one object so future
// preview-specific values can be added without changing the rewrite flow.
const defaultPreviewOverrides: Record<string, string> = {
	ENV_TYPE: 'preview',
	OBJECT_STORAGE_PREFIX: 'preview',
};

function main() {
	assertAppRoot();

	// Convex prints env vars in dotenv format already. Capture stdout instead of
	// shell-redirecting so this script works the same in local shells and CI.
	console.log(`Reading current Convex environment variables into ${envFile}`);
	const devEnv = runConvex(['env', 'list', '--deployment', 'dev'], 'capture');
	const defaultPreviewEnv = applyPreviewOverrides(devEnv, defaultPreviewOverrides);

	// `mode` only applies when the file is created. chmod after writing as well
	// so repeated runs keep the copied secrets readable only by this user.
	writeEnvFile(defaultPreviewEnv);

	console.log(`Applying default preview overrides: ${Object.keys(defaultPreviewOverrides).join(', ')}`);
	console.log(`Setting default ${targetType} Convex environment variables with --force`);

	// `env default set` updates the template used for future deployments. `--force`
	// is expected here because this script is the source of truth for defaults.
	runConvex(['env', 'default', 'set', '--type', targetType, '--from-file', envFile, '--force']);

	console.log(`Synced ${envFile} to default ${targetType} Convex environment variables.`);

	const currentPreview = currentPreviewTarget();
	if (!currentPreview) {
		console.log(`No current preview deployment found in ${envLocalFile}; skipped deployment env sync.`);
		return;
	}

	const deploymentOverrides = {
		...defaultPreviewOverrides,
		OBJECT_STORAGE_PREFIX: previewObjectStoragePrefix(currentPreview.previewName),
	};
	const deploymentEnv = applyPreviewOverrides(devEnv, deploymentOverrides);
	writeEnvFile(deploymentEnv);

	console.log(
		`Setting ${currentPreview.deploymentRef} Convex environment variables with ${deploymentOverrides.OBJECT_STORAGE_PREFIX}`,
	);
	runConvex(['env', 'set', '--deployment', currentPreview.deploymentRef, '--from-file', envFile, '--force']);
	console.log(`Synced ${envFile} to ${currentPreview.deploymentRef}.`);
}

function runConvex(args: string[], mode: 'capture' | 'inherit' = 'inherit') {
	const result = spawnSync('bun', ['convex', ...args], {
		encoding: 'utf8',
		// Capture only commands whose stdout is data we need to rewrite. All other
		// commands inherit stdio so Convex prompts/errors stay visible.
		stdio: mode === 'capture' ? ['inherit', 'pipe', 'inherit'] : 'inherit',
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		const command = ['bun', 'convex', ...args].join(' ');
		throw new Error(`${command} failed with exit code ${result.status ?? 1}.`);
	}

	return typeof result.stdout === 'string' ? result.stdout : '';
}

function applyPreviewOverrides(contents: string, overrides: Record<string, string>) {
	// Convex's `env list` output is dotenv-like text, not JSON. Preserve unknown
	// lines so comments/formatting from future CLI output are not accidentally
	// discarded while we surgically replace only keys we own.
	const body = contents.trimEnd();
	const lines = body.length > 0 ? body.split(/\r?\n/) : [];
	const seenOverrides = new Set<string>();
	const nextLines: string[] = [];

	for (const line of lines) {
		const key = parseEnvKey(line);
		const override = key ? getOverride(overrides, key) : undefined;

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
	for (const [key, value] of Object.entries(overrides)) {
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

function getOverride(overrides: Record<string, string>, key: string) {
	// Avoid indexing inherited properties. Env names are external text, so keep
	// the lookup explicit even though the current override object is tiny.
	if (Object.prototype.hasOwnProperty.call(overrides, key)) {
		return overrides[key];
	}

	return undefined;
}

function writeEnvFile(contents: string) {
	writeFileSync(envFile, contents, { encoding: 'utf8', mode: 0o600 });
	chmodSync(envFile, 0o600);
}

function currentPreviewTarget() {
	const explicitDeployment = readArg('--deployment');
	const explicitPreviewName = readArg('--preview-name') ?? readArg('--branch');
	if (explicitDeployment) {
		return {
			deploymentRef: explicitDeployment,
			previewName: explicitPreviewName ?? explicitDeployment.replace(/^preview\//, ''),
		};
	}

	const entries = loadEnvLocal();
	const deploymentRef = entries.get('CONVEX_PREVIEW_REF');
	const previewName =
		explicitPreviewName ?? entries.get('CONVEX_PREVIEW_NAME') ?? deploymentRef?.replace(/^preview\//, '');
	if (!deploymentRef || !previewName) return undefined;

	return {
		deploymentRef,
		previewName,
	};
}

function readArg(name: string) {
	const prefix = `${name}=`;
	const inline = args.find((arg) => arg.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);

	const index = args.indexOf(name);
	if (index >= 0) return args[index + 1];

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

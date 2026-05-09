import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const appPackageName = '@meseeks/app';
const envFile = '.env.convex.dev';
const targetType = 'preview';

// The app currently pins an older Convex runtime package; this command needs the newer default-env CLI.
const convexCliPackage = process.env.CONVEX_CLI_PACKAGE ?? 'convex@latest';

const previewOverrides = {
	ENV_TYPE: 'preview',
} satisfies Record<string, string>;

function main() {
	assertAppRoot();

	console.log(`Reading current Convex environment variables into ${envFile}`);
	const devEnv = runConvex(['env', 'list'], 'capture');
	const previewEnv = applyPreviewOverrides(devEnv);
	writeFileSync(envFile, previewEnv, { encoding: 'utf8', mode: 0o600 });
	chmodSync(envFile, 0o600);

	console.log(`Applying preview overrides: ${Object.keys(previewOverrides).join(', ')}`);
	console.log(`Setting default ${targetType} Convex environment variables with --force`);
	runConvex(['env', 'default', 'set', '--type', targetType, '--from-file', envFile, '--force']);

	console.log(`Synced ${envFile} to default ${targetType} Convex environment variables.`);
}

function assertAppRoot() {
	if (!existsSync('package.json') || !existsSync('convex.json')) {
		throw new Error('Run this from apps/meseeks.');
	}

	const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { name?: string };

	if (packageJson.name !== appPackageName) {
		throw new Error('Run this from apps/meseeks.');
	}
}

function runConvex(args: string[], mode: 'capture' | 'inherit' = 'inherit') {
	const result = spawnSync('bunx', [convexCliPackage, ...args], {
		encoding: 'utf8',
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
	const body = contents.trimEnd();
	const lines = body.length > 0 ? body.split(/\r?\n/) : [];
	const seenOverrides = new Set<string>();
	const nextLines: string[] = [];

	for (const line of lines) {
		const key = parseEnvKey(line);
		const override = key ? getPreviewOverride(key) : undefined;

		if (key && override !== undefined) {
			if (!seenOverrides.has(key)) {
				nextLines.push(`${key}=${formatDotenvValue(override)}`);
				seenOverrides.add(key);
			}

			continue;
		}

		nextLines.push(line);
	}

	for (const [key, value] of Object.entries(previewOverrides)) {
		if (!seenOverrides.has(key)) {
			nextLines.push(`${key}=${formatDotenvValue(value)}`);
		}
	}

	return `${nextLines.join('\n')}\n`;
}

function parseEnvKey(line: string) {
	const match = line.match(/^\s*(?:export\s+)?([A-Za-z][A-Za-z0-9_]*)\s*=/);
	return match?.[1];
}

function getPreviewOverride(key: string) {
	if (Object.prototype.hasOwnProperty.call(previewOverrides, key)) {
		return previewOverrides[key as keyof typeof previewOverrides];
	}

	return undefined;
}

function formatDotenvValue(value: string) {
	if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) {
		return value;
	}

	return JSON.stringify(value);
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

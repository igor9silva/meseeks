import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const appPackageName = '@meseeks/app';
const convexCliPackage = 'convex@1.34.1';

export const envLocalFile = '.env.local';

export function assertAppRoot() {
	if (!existsSync('package.json') || !existsSync('convex.json')) {
		throw new Error('Run this from apps/meseeks.');
	}

	const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { name?: string };
	if (packageJson.name !== appPackageName) {
		throw new Error('Run this from apps/meseeks.');
	}
}

export function readDotenv(path: string) {
	if (!existsSync(path)) return new Map<string, string>();

	const entries = new Map<string, string>();
	for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
		if (!match) continue;

		entries.set(match[1], parseDotenvValue(match[2].trim()));
	}

	return entries;
}

export function writeDotenv(path: string, entries: Map<string, string>) {
	const contents = `${Array.from(entries)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${formatDotenvValue(value)}`)
		.join('\n')}\n`;

	writeFileSync(path, contents, { encoding: 'utf8', mode: 0o600 });
	chmodSync(path, 0o600);
}

export function getPreviewName(args: string[]) {
	const explicit =
		readArg(args, '--branch') ??
		readArg(args, '--preview-name') ??
		process.env.CONVEX_PREVIEW_NAME ??
		process.env.VERCEL_GIT_COMMIT_REF;
	if (explicit) return normalizePreviewName(explicit);

	const envLocalPreviewName = readDotenv(envLocalFile).get('CONVEX_PREVIEW_NAME');
	if (envLocalPreviewName) return normalizePreviewName(envLocalPreviewName);

	const branch = runCapture('git', ['branch', '--show-current']).trim();
	if (branch) return normalizePreviewName(branch);

	throw new Error('Could not infer the branch name. Pass --branch <branch-name>.');
}

export function getCurrentBranch() {
	return runCapture('git', ['branch', '--show-current']).trim();
}

export function isMainBranch() {
	const branch = getCurrentBranch();
	return branch === 'main' || branch === 'master';
}

export function previewRef(previewName: string) {
	return `preview/${previewName}`;
}

export function loadEnvLocal() {
	return readDotenv(envLocalFile);
}

export function run(command: string, args: string[], options: SpawnSyncOptions = {}) {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		encoding: 'utf8',
		...options,
	});

	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(`${[command, ...args].join(' ')} failed with exit code ${result.status ?? 1}.`);
	}
}

export function tryRun(command: string, args: string[], options: SpawnSyncOptions = {}) {
	const result = spawnSync(command, args, {
		stdio: 'pipe',
		encoding: 'utf8',
		...options,
	});

	return {
		ok: result.status === 0 && !result.error,
		output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
	};
}

export function runConvex(args: string[], options: SpawnSyncOptions = {}) {
	run('bunx', ['-y', convexCliPackage, ...args], options);
}

export function tryRunConvex(args: string[], options: SpawnSyncOptions = {}) {
	return tryRun('bunx', ['-y', convexCliPackage, ...args], options);
}

export function ensureConvexClientUrls(entries: Map<string, string>) {
	const cloudUrl =
		entries.get('CONVEX_CLOUD_URL') ??
		deploymentUrl(entries.get('CONVEX_DEPLOYMENT'), 'cloud') ??
		entries.get('VITE_CONVEX_URL');
	if (cloudUrl) entries.set('VITE_CONVEX_URL', cloudUrl);

	const siteUrl =
		entries.get('CONVEX_SITE_URL') ??
		deploymentUrl(entries.get('CONVEX_DEPLOYMENT'), 'site') ??
		cloudUrl?.replace(/\.convex\.cloud$/, '.convex.site') ??
		entries.get('VITE_CONVEX_SITE_URL');
	if (siteUrl) entries.set('VITE_CONVEX_SITE_URL', siteUrl);
}

function runCapture(command: string, args: string[]) {
	const result = spawnSync(command, args, {
		stdio: ['ignore', 'pipe', 'ignore'],
		encoding: 'utf8',
	});

	if (result.error || result.status !== 0) return '';
	return typeof result.stdout === 'string' ? result.stdout : '';
}

function readArg(args: string[], name: string) {
	const prefix = `${name}=`;
	const inline = args.find((arg) => arg.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);

	const index = args.indexOf(name);
	if (index >= 0) return args[index + 1];

	return undefined;
}

function normalizePreviewName(value: string) {
	return value.replace(/^preview\//, '').trim();
}

function parseDotenvValue(rawValue: string) {
	const value = stripDotenvComment(rawValue).trim();
	if (!value) return '';

	if (value.startsWith('"') && value.endsWith('"')) {
		try {
			return JSON.parse(value);
		} catch {
			return value.slice(1, -1);
		}
	}

	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1);
	}

	return value;
}

function formatDotenvValue(value: string) {
	if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) return value;
	return JSON.stringify(value);
}

function deploymentUrl(deployment: string | undefined, target: 'cloud' | 'site') {
	if (!deployment) return undefined;

	const match = deployment.match(/([a-z0-9]+(?:-[a-z0-9]+)+)$/i);
	if (!match) return undefined;

	return `https://${match[1]}.convex.${target}`;
}

function stripDotenvComment(value: string) {
	let quote: '"' | "'" | undefined;
	let escaped = false;

	for (let index = 0; index < value.length; index++) {
		const character = value[index];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (quote) {
			if (quote === '"' && character === '\\') {
				escaped = true;
				continue;
			}

			if (character === quote) quote = undefined;
			continue;
		}

		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}

		if (character === '#' && (index === 0 || /\s/.test(value[index - 1]))) {
			return value.slice(0, index);
		}
	}

	return value;
}

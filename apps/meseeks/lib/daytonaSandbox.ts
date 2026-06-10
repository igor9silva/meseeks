import { Buffer } from 'node:buffer';
import { Daytona } from '@daytona/sdk';
import type {
	CreateSandboxBaseParams,
	CreateSandboxFromImageParams,
	CreateSandboxFromSnapshotParams,
	DaytonaConfig,
	Sandbox,
} from '@daytona/sdk';
import { z } from 'zod/v3';
import type { SandboxAdapter, SandboxRunInput } from './reactor/adapters';
import { createDaytonaSandboxAdapter } from './reactor/runtimeAdapters';

export const daytonaSettingsSchema = z.object({
	apiKey: z.string().min(1),
	apiUrl: z.string().url().optional(),
	target: z.string().min(1).optional(),
	image: z.string().min(1).optional(),
});

export const daytonaOutputSchema = z.object({
	path: z.string().min(1),
	contentType: z.string().min(1).optional(),
});

const executeResponseSchema = z
	.object({
		exitCode: z.number().int(),
		result: z.string().default(''),
		artifacts: z
			.object({
				stdout: z.string().optional(),
			})
			.passthrough()
			.optional(),
	})
	.passthrough();

type DaytonaSettings = z.infer<typeof daytonaSettingsSchema>;
type DaytonaOutput = z.infer<typeof daytonaOutputSchema>;

const VIRTUAL_WORKSPACE_ROOT = '/workspace';
const DAYTONA_WORKSPACE_ROOT = '/tmp/reactor-workspace';

export function materializeDaytonaWorkspaceText(text: string) {
	//
	return text.split(VIRTUAL_WORKSPACE_ROOT).join(DAYTONA_WORKSPACE_ROOT);
}

export function createDaytonaReactorSandbox(args: {
	settings: DaytonaSettings;
	declaredOutputs: DaytonaOutput[];
}): SandboxAdapter {
	//
	return createDaytonaSandboxAdapter({
		declaredOutputPaths: () => args.declaredOutputs.map((output) => output.path),
		create: async (input) => {
			const daytona = new Daytona(daytonaConfig(args.settings));
			const sandbox = await createSandbox({
				daytona,
				settings: args.settings,
				input,
			});

			return {
				id: sandbox.id,
				writeFile: async (path, content) => {
					const daytonaPath = toDaytonaPath(path);
					await ensureParentFolders(sandbox, daytonaPath);
					await sandbox.fs.uploadFile(Buffer.from(content), daytonaPath, seconds(input.timeoutMs));
				},
				execute: async (command, options) => {
					const raw = await sandbox.process.executeCommand(
						toDaytonaCommand(command),
						DAYTONA_WORKSPACE_ROOT,
						toDaytonaEnv(options.env),
						seconds(options.timeoutMs),
					);
					const parsed = executeResponseSchema.parse(raw);

					return {
						stdout: parsed.artifacts?.stdout ?? parsed.result,
						stderr: '',
						exitCode: parsed.exitCode,
						metadata: {
							provider: 'daytona',
							sdk: '@daytona/sdk',
							sandboxId: sandbox.id,
							image: args.settings.image,
							target: args.settings.target,
							workspaceRoot: DAYTONA_WORKSPACE_ROOT,
						},
					};
				},
				readFile: async (path) => {
					const bytes = await sandbox.fs.downloadFile(toDaytonaPath(path), seconds(input.timeoutMs));
					return new Uint8Array(bytes);
				},
				close: async () => {
					await cleanupSandbox({ daytona, sandbox });
				},
			};
		},
	});
}

function toDaytonaPath(path: string) {
	//
	if (path === VIRTUAL_WORKSPACE_ROOT) return DAYTONA_WORKSPACE_ROOT;
	if (path.startsWith(`${VIRTUAL_WORKSPACE_ROOT}/`)) {
		return `${DAYTONA_WORKSPACE_ROOT}${path.slice(VIRTUAL_WORKSPACE_ROOT.length)}`;
	}

	return path;
}

function toDaytonaCommand(command: string) {
	//
	return command.split(VIRTUAL_WORKSPACE_ROOT).join(DAYTONA_WORKSPACE_ROOT);
}

function toDaytonaEnv(env: Record<string, string>) {
	//
	const mapped: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		mapped[key] = value.split(VIRTUAL_WORKSPACE_ROOT).join(DAYTONA_WORKSPACE_ROOT);
	}

	return mapped;
}

function daytonaConfig(settings: DaytonaSettings): DaytonaConfig {
	//
	const config: DaytonaConfig = {
		apiKey: settings.apiKey,
		otelEnabled: false,
	};
	if (settings.apiUrl) config.apiUrl = settings.apiUrl;
	if (settings.target) config.target = settings.target;

	return config;
}

async function createSandbox(args: { daytona: Daytona; settings: DaytonaSettings; input: SandboxRunInput }) {
	//
	const base: CreateSandboxBaseParams = {
		language: 'typescript',
		envVars: args.input.env,
		labels: {
			reactor: 'true',
			action: args.input.actionId,
		},
		ephemeral: true,
		autoDeleteInterval: 0,
		autoStopInterval: 15,
	};
	const timeout = seconds(args.input.timeoutMs);

	if (args.settings.image) {
		const params: CreateSandboxFromImageParams = {
			...base,
			image: args.settings.image,
		};
		return await args.daytona.create(params, { timeout });
	}

	const params: CreateSandboxFromSnapshotParams = base;
	return await args.daytona.create(params, { timeout });
}

async function ensureParentFolders(sandbox: Sandbox, path: string) {
	//
	const folders = parentFolders(path);

	for (const folder of folders) {
		await sandbox.fs.createFolder(folder, '755').catch(() => {});
	}
}

function parentFolders(path: string) {
	//
	const folders = [];
	const parts = path.split('/');
	let current = '';

	for (const part of parts) {
		if (!part) continue;
		current = `${current}/${part}`;
		if (current === path) break;
		folders.push(current);
	}

	return folders;
}

async function cleanupSandbox(args: { daytona: Daytona; sandbox: Sandbox }) {
	//
	await args.daytona.delete(args.sandbox, 60).catch((error: unknown) => {
		console.warn('Daytona sandbox cleanup failed', {
			sandboxId: args.sandbox.id,
			message: error instanceof Error ? error.message : 'Unknown cleanup failure.',
		});
	});
	await args.daytona[Symbol.asyncDispose]();
}

function seconds(ms: number) {
	//
	return Math.max(1, Math.ceil(ms / 1000));
}

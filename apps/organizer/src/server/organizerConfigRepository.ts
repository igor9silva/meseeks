import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { findRepoRoot } from '~/server/repoRoot';
import { taskConfigSchema, type TaskConfig } from '~/server/taskIndexSchemas';

const organizerConfigSchema = z.object({
	version: z.literal(1),
	entries: z.record(z.string().min(1), taskConfigSchema),
});

export type OrganizerConfig = z.infer<typeof organizerConfigSchema>;

function getOrganizerConfigPath(): string {
	//
	return join(findRepoRoot(), 'private', 'files', 'organizer.json');
}

function createEmptyOrganizerConfig(): OrganizerConfig {
	//
	return {
		version: 1,
		entries: {},
	};
}

export function readOrganizerConfig(): OrganizerConfig {
	//
	const configPath = getOrganizerConfigPath();

	if (!existsSync(configPath)) return createEmptyOrganizerConfig();

	const parsedJson: unknown = JSON.parse(readFileSync(configPath, 'utf-8'));
	return organizerConfigSchema.parse(parsedJson);
}

export function updateOrganizerConfigEntry(configKey: string, config: TaskConfig): OrganizerConfig {
	//
	const configPath = getOrganizerConfigPath();
	const currentConfig = readOrganizerConfig();
	const nextConfig: OrganizerConfig = {
		version: 1,
		entries: {
			...currentConfig.entries,
			[configKey]: config,
		},
	};

	mkdirSync(dirname(configPath), { recursive: true });
	writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8');

	return nextConfig;
}

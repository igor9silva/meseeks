import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { taskConfigSchema, type TaskConfig } from '~/server/taskIndexSchemas';

const organizerConfigKeySchema = z.union([z.literal('/'), z.string().regex(/^(public|private):/)]);

const updateOrganizerConfigInputSchema = z.object({
	configKey: organizerConfigKeySchema,
	config: taskConfigSchema,
});

export const getOrganizerConfig = createServerFn({ method: 'GET' }).handler(async () => {
	const repository = await import('~/server/organizerConfigRepository');
	return repository.readOrganizerConfig();
});

export const updateOrganizerConfig = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => updateOrganizerConfigInputSchema.parse(input))
	.handler(async ({ data }) => {
		const repository = await import('~/server/organizerConfigRepository');
		const config: TaskConfig = data.config;
		const nextConfig = repository.updateOrganizerConfigEntry(data.configKey, config);

		return {
			configKey: data.configKey,
			config: nextConfig.entries[data.configKey],
		};
	});

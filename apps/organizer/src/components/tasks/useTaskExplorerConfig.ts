import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { getOrganizerConfig, updateOrganizerConfig } from '~/server/organizerConfig';
import type { TaskConfig } from '~/server/taskIndexSchemas';
import { areTaskConfigsEqual, mergeTaskConfig, type TaskConfigPatch } from './taskConfig';

interface TaskExplorerConfigInput {
	activeConfigKey: string;
	currentTaskConfig: TaskConfig | null | undefined;
	defaultGlobalConfig: TaskConfig;
}

export function useTaskExplorerConfig({
	activeConfigKey,
	currentTaskConfig,
	defaultGlobalConfig,
}: TaskExplorerConfigInput) {
	//
	const queryClient = useQueryClient();
	const getOrganizerConfigServer = useServerFn(getOrganizerConfig);
	const updateOrganizerConfigServer = useServerFn(updateOrganizerConfig);
	const [configOverride, setConfigOverride] = useState<{ configKey: string; config: TaskConfig } | null>(null);
	const organizerConfigQuery = useQuery({
		queryKey: ['organizer-config'],
		queryFn: () => getOrganizerConfigServer(),
		refetchInterval: 2000,
	});
	const savedActiveConfig = organizerConfigQuery.data?.entries[activeConfigKey] ?? null;
	const baseActiveConfig = savedActiveConfig ?? currentTaskConfig ?? defaultGlobalConfig;
	const shouldUseOverride =
		configOverride?.configKey === activeConfigKey &&
		(savedActiveConfig === null || !areTaskConfigsEqual(savedActiveConfig, configOverride.config));
	const activeConfig = shouldUseOverride ? configOverride.config : baseActiveConfig;
	const updateOrganizerConfigMutation = useMutation({
		mutationFn: (input: { configKey: string; config: TaskConfig }) =>
			updateOrganizerConfigServer({
				data: input,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['organizer-config'] });
		},
	});

	function persistTaskConfigPatch(patch: TaskConfigPatch): void {
		//
		const nextConfig = mergeTaskConfig(activeConfig, patch);

		setConfigOverride({ configKey: activeConfigKey, config: nextConfig });
		updateOrganizerConfigMutation.mutate(
			{
				configKey: activeConfigKey,
				config: nextConfig,
			},
			{
				onError: () => setConfigOverride(null),
			},
		);
	}

	return {
		activeConfig,
		persistTaskConfigPatch,
	};
}

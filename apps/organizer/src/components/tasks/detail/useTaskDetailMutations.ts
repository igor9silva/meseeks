import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import type { TaskSource } from '~/lib/explorerSearchParams';
import {
	renameTask,
	trashTask,
	updateTaskPriority,
	updateTaskSource,
	updateTaskTags,
	updateTaskTitle,
} from '~/server/taskExplorer';
import type { TaskDetailTask } from '../taskExplorerTypes';

interface TaskDetailMutationCallbacks {
	onTaskSourceChanged: (taskKey: string, taskSource: TaskSource) => void;
	onTaskRenamed: (taskKey: string) => void;
	onTaskTrashed: (taskKey: string) => void;
	onRenameSuccess: () => void;
	onTitleSuccess: () => void;
}

export function useTaskDetailMutations(task: TaskDetailTask, callbacks: TaskDetailMutationCallbacks) {
	//
	const queryClient = useQueryClient();
	const renameTaskServer = useServerFn(renameTask);
	const trashTaskServer = useServerFn(trashTask);
	const updateTaskPriorityServer = useServerFn(updateTaskPriority);
	const updateTaskSourceServer = useServerFn(updateTaskSource);
	const updateTaskTagsServer = useServerFn(updateTaskTags);
	const updateTaskTitleServer = useServerFn(updateTaskTitle);
	const invalidateTaskQueries = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
			queryClient.invalidateQueries({ queryKey: ['task-current'] }),
			queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
		]);
	};
	const updateTaskSourceMutation = useMutation({
		mutationFn: (taskSource: TaskSource) => updateTaskSourceServer({ data: { taskKey: task.key, taskSource } }),
		onSuccess: async (result) => {
			await invalidateTaskQueries();
			callbacks.onTaskSourceChanged(result.newTaskKey, result.taskSource);
		},
	});
	const renameTaskMutation = useMutation({
		mutationFn: (filename: string) => renameTaskServer({ data: { taskKey: task.key, filename } }),
		onSuccess: async (result) => {
			await invalidateTaskQueries();
			callbacks.onRenameSuccess();
			callbacks.onTaskRenamed(result.newTaskKey);
		},
	});
	const trashTaskMutation = useMutation({
		mutationFn: () => trashTaskServer({ data: { taskKey: task.key } }),
		onSuccess: async () => {
			await invalidateTaskQueries();
			callbacks.onTaskTrashed(task.key);
		},
	});
	const updateTaskTitleMutation = useMutation({
		mutationFn: (title: string) => updateTaskTitleServer({ data: { taskKey: task.key, title } }),
		onSuccess: async () => {
			await invalidateTaskQueries();
			callbacks.onTitleSuccess();
		},
	});
	const updateTaskTagsMutation = useMutation({
		mutationFn: ({ action, tag }: { action: 'add' | 'remove'; tag: string }) =>
			updateTaskTagsServer({ data: { taskKey: task.key, action, tag } }),
		onSuccess: invalidateTaskQueries,
	});
	const updateTaskPriorityMutation = useMutation({
		mutationFn: (priority: NonNullable<TaskDetailTask['priority']>) =>
			updateTaskPriorityServer({ data: { taskKey: task.key, priority } }),
		onSuccess: invalidateTaskQueries,
	});
	const isTaskFileMutationPending =
		renameTaskMutation.isPending ||
		trashTaskMutation.isPending ||
		updateTaskPriorityMutation.isPending ||
		updateTaskSourceMutation.isPending ||
		updateTaskTitleMutation.isPending;

	return {
		isTaskFileMutationPending,
		renameTaskMutation,
		trashTaskMutation,
		updateTaskPriorityMutation,
		updateTaskSourceMutation,
		updateTaskTagsMutation,
		updateTaskTitleMutation,
	};
}

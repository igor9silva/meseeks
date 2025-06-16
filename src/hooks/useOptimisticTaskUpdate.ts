import { convexQuery } from '@convex-dev/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Doc, Id } from 'convex/_generated/dataModel';

/**
 * Type for task update function parameters
 */
type TaskUpdateParams = {
	task: Doc<'tasks'>;
	isActive: boolean;
};

/**
 * Custom hook that provides optimistic updates for task status changes
 * This handles immediate UI updates before server confirmation arrives
 */
export function useOptimisticTaskUpdate() {
	//
	const queryClient = useQueryClient();

	/**
	 * Updates an array of tasks, changing the status of the target task
	 */
	const updateTasksArray = (
		oldData: Doc<'tasks'>[] | undefined,
		taskId: Id<'tasks'>,
		isActive: boolean,
	): Doc<'tasks'>[] | undefined => {
		//
		if (!oldData || !Array.isArray(oldData)) return oldData;

		return oldData.map((t) => (t._id === taskId ? { ...t, isActive } : t));
	};

	/**
	 * Optimistically update the task's active status in all relevant queries
	 * This creates the appearance of instant updates in the UI
	 */
	const updateTaskStatus = ({ task, isActive }: TaskUpdateParams): void => {
		//
		// Create query objects for all places where this task might appear
		const inboxQuery = convexQuery(api.tasks.public.findAll, {});

		const parentListQuery = task.parentId
			? convexQuery(api.tasks.public.findAll, { parentId: task.parentId })
			: null;

		const singleTaskQuery = convexQuery(api.tasks.public.findOne, { taskId: task._id });

		// Update the task in the inbox list
		queryClient.setQueryData<Doc<'tasks'>[]>(inboxQuery.queryKey, (oldData) =>
			updateTasksArray(oldData, task._id, isActive),
		);

		// Update the task in its parent's list (if applicable)
		if (task.parentId && parentListQuery) {
			queryClient.setQueryData<Doc<'tasks'>[]>(parentListQuery.queryKey, (oldData) =>
				updateTasksArray(oldData, task._id, isActive),
			);
		}

		// Update the individual task detail view
		queryClient.setQueryData<Doc<'tasks'>>(singleTaskQuery.queryKey, (oldData) => {
			if (!oldData) return oldData;
			return { ...oldData, isActive };
		});
	};

	return {
		updateTaskStatus,
	};
}

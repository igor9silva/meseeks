import { useTask } from '~/hooks/query/useTask';
import { useSplatParams } from '~/hooks/useSplatParams';

export function useCurrentTask() {
	//
	const taskId = useCurrentTaskId();

	return useTask(taskId);
}

export function useCurrentTaskId() {
	//
	const { taskId } = useSplatParams();
	if (!taskId) throw new Error('Could not determine current task.');

	return taskId;
}

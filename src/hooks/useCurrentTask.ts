import { useSplatParams } from '~/hooks/useSplatParams';
import { useTask } from '~/hooks/useTask';

export function useCurrentTask() {
	//
	const { taskId } = useSplatParams();
	if (!taskId) throw new Error('Could not determine current task.');

	return useTask(taskId);
}

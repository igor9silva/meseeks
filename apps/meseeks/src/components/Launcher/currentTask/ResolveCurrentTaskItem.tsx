import { CircleCheckBig } from 'lucide-react';
import { CommandItem } from '~/components/ui/command';
import { useResolve } from '~/hooks/useTaskMutations';
import { useLauncher } from '../LauncherProvider';
import type { CurrentTask } from '../types';

export function ResolveCurrentTaskItem({ task }: { task: CurrentTask }) {
	//
	const { close } = useLauncher();
	const { resolve, isResolving } = useResolve();
	if (!task.isActive) return null;

	const handleSelect = () => {
		if (isResolving) return;
		resolve({ taskId: task._id });
		close();
	};

	return (
		<CommandItem keywords={['done', 'resolve', 'current']} onSelect={handleSelect}>
			<CircleCheckBig className="mr-2" />
			Resolve current task
		</CommandItem>
	);
}

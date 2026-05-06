import { CircleX } from 'lucide-react';
import { CommandItem } from '~/components/ui/command';
import { useDiscard } from '~/hooks/useTaskMutations';
import { useLauncher } from '../LauncherProvider';
import type { CurrentTask } from '../types';

export function DiscardCurrentTaskItem({ task }: { task: CurrentTask }) {
	//
	const { close } = useLauncher();
	const { discard, isDiscarding } = useDiscard();
	if (!task.isActive) return null;

	const handleSelect = () => {
		//
		if (isDiscarding) return;
		discard({ taskId: task._id });
		close();
	};

	return (
		<CommandItem keywords={['discard', 'trash', 'archive', 'current']} onSelect={handleSelect}>
			<CircleX className="mr-2" />
			Discard current task
		</CommandItem>
	);
}

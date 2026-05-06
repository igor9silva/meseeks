import { RotateCcw } from 'lucide-react';
import { CommandItem } from '~/components/ui/command';
import { useStop } from '~/hooks/useTaskMutations';
import { useLauncher } from '../LauncherProvider';
import type { CurrentTask } from '../types';

export function StopReactionsItem({ task }: { task: CurrentTask }) {
	//
	const { close } = useLauncher();
	const { stop, isStopping } = useStop();
	if (task.status !== 'acting') return null;

	const handleSelect = () => {
		//
		if (isStopping) return;
		stop({ taskId: task._id });
		close();
	};

	return (
		<CommandItem keywords={['stop', 'reactions', 'reacting', 'current']} onSelect={handleSelect}>
			<RotateCcw className="mr-2" />
			Stop reacting
		</CommandItem>
	);
}

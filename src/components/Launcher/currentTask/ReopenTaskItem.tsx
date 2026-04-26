import { RotateCcw } from 'lucide-react';
import { asBigInt } from 'lib/money';
import { CommandItem } from '~/components/ui/command';
import { useIncreaseBudget } from '~/hooks/useTaskMutations';
import { useLauncher } from '../LauncherProvider';
import type { CurrentTask } from '../types';

export function ReopenTaskItem({ task }: { task: CurrentTask }) {
	//
	const { close } = useLauncher();
	const { increaseBudget, isIncreasingBudget } = useIncreaseBudget();
	if (task.isActive) return null;

	const handleSelect = () => {
		//
		if (isIncreasingBudget) return;
		increaseBudget({ taskId: task._id, amount: asBigInt({ dollars: 0.5 }) });
		close();
	};

	return (
		<CommandItem keywords={['reopen', 'current']} onSelect={handleSelect}>
			<RotateCcw className="mr-2" />
			Reopen with $0.50 of budget
		</CommandItem>
	);
}

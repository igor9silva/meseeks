import { BrushCleaning } from 'lucide-react';
import { CommandItem } from '~/components/ui/command';
import { useDecreaseBudget } from '~/hooks/useTaskMutations';
import { useLauncher } from '../LauncherProvider';
import type { CurrentTask } from '../types';

export function ClearEnergyItem({ task }: { task: CurrentTask }) {
	//
	const { close } = useLauncher();
	const { decreaseBudget, isDecreasingBudget } = useDecreaseBudget();
	if (!task.isActive || task.energyBudget.available <= 0n) return null;

	const handleSelect = () => {
		if (isDecreasingBudget) return;
		decreaseBudget({ taskId: task._id, amount: task.energyBudget.available });
		close();
	};

	return (
		<CommandItem keywords={['energy', 'budget', 'decrease', 'reduce', 'clear']} onSelect={handleSelect}>
			<BrushCleaning className="mr-2" />
			Clear energy (remove remaining budget)
		</CommandItem>
	);
}

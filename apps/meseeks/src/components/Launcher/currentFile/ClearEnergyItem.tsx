import { BrushCleaning } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';
import { useUpdateBudget } from '~/hooks/useFileMutations';
import { useLauncher } from '../LauncherProvider';
import type { CurrentFile } from '../types';

export function ClearEnergyItem({ file }: { file: CurrentFile }) {
	//
	const { close } = useLauncher();
	const { updateBudget, isChangingEnergy } = useUpdateBudget();
	if (!file.isActive || file.energyBudget.available <= 0n) return null;

	const handleSelect = () => {
		if (isChangingEnergy) return;
		updateBudget({ fileId: file._id, amount: -file.energyBudget.available });
		close();
	};

	return (
		<CommandItem keywords={['energy', 'budget', 'decrease', 'reduce', 'clear']} onSelect={handleSelect}>
			<BrushCleaning className="mr-2" />
			Clear energy (remove remaining budget)
		</CommandItem>
	);
}

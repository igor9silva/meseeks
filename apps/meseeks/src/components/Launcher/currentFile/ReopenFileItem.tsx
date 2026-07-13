import { RotateCcw } from 'lucide-react';
import { asBigInt } from 'lib/money';
import { CommandItem } from '@pro/ui/command';
import { useChangeEnergy } from '~/hooks/useFileMutations';
import { useLauncher } from '../LauncherProvider';
import type { CurrentFile } from '../types';

export function ReopenFileItem({ file }: { file: CurrentFile }) {
	//
	const { close } = useLauncher();
	const { changeEnergy, isChangingEnergy } = useChangeEnergy();
	if (file.isActive) return null;

	const handleSelect = () => {
		//
		if (isChangingEnergy) return;
		changeEnergy({ fileId: file._id, amount: asBigInt({ dollars: 0.5 }), shouldReopen: true });
		close();
	};

	return (
		<CommandItem keywords={['reopen', 'current']} onSelect={handleSelect}>
			<RotateCcw className="mr-2" />
			Reopen with 0.50 energy
		</CommandItem>
	);
}

import { RotateCcw } from 'lucide-react';
import { CommandItem } from '@pro/ui/command';
import { useStop } from '~/hooks/useFileMutations';
import { useLauncher } from '../LauncherProvider';
import type { CurrentFile } from '../types';

export function StopReactionsItem({ file }: { file: CurrentFile }) {
	//
	const { close } = useLauncher();
	const { stop, isStopping } = useStop();
	if (file.status !== 'acting') return null;

	const handleSelect = () => {
		//
		if (isStopping) return;
		stop({ fileId: file._id });
		close();
	};

	return (
		<CommandItem keywords={['stop', 'reactions', 'reacting', 'current']} onSelect={handleSelect}>
			<RotateCcw className="mr-2" />
			Stop reacting
		</CommandItem>
	);
}

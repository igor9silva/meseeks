import { CircleX } from 'lucide-react';
import { CommandItem } from '@pro/ui/command';
import { useDiscard } from '~/hooks/useFileMutations';
import { useLauncher } from '../LauncherProvider';
import type { CurrentFile } from '../types';

export function DiscardCurrentFileItem({ file }: { file: CurrentFile }) {
	//
	const { close } = useLauncher();
	const { discard, isDiscarding } = useDiscard();
	if (!file.isActive) return null;

	const handleSelect = () => {
		//
		if (isDiscarding) return;
		discard({ fileId: file._id });
		close();
	};

	return (
		<CommandItem keywords={['discard', 'trash', 'archive', 'current']} onSelect={handleSelect}>
			<CircleX className="mr-2" />
			Discard current file
		</CommandItem>
	);
}

import { CircleCheckBig } from 'lucide-react';
import { CommandItem } from '@pro/ui/command';
import { useResolve } from '~/hooks/useFileMutations';
import { useLauncher } from '../LauncherProvider';
import type { CurrentFile } from '../types';

export function ResolveCurrentFileItem({ file }: { file: CurrentFile }) {
	//
	const { close } = useLauncher();
	const { resolve, isResolving } = useResolve();
	if (!file.isActive) return null;

	const handleSelect = () => {
		if (isResolving) return;
		resolve({ fileId: file._id });
		close();
	};

	return (
		<CommandItem keywords={['done', 'resolve', 'current']} onSelect={handleSelect}>
			<CircleCheckBig className="mr-2" />
			Resolve current file
		</CommandItem>
	);
}

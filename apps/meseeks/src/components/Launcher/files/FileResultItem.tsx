import { Circle, CircleCheckBig } from 'lucide-react';
import { CommandItem } from '@pro/ui/command';
import type { LauncherFile } from '../types';

export function FileResultItem({ file, onSelect }: { file: LauncherFile; onSelect: (value: string) => void }) {
	//
	const name = file.name || 'Untitled file';

	return (
		<CommandItem value={`/tasks/${file._id}`} keywords={[name]} onSelect={onSelect}>
			{file.isActive ? <Circle className="mr-2" /> : <CircleCheckBig className="mr-2" />}
			<span className={file.isActive ? '' : 'line-through'}>{name}</span>
		</CommandItem>
	);
}

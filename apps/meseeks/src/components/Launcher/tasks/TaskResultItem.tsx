import { Circle, CircleCheckBig } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';
import type { LauncherTask } from '../types';

export function TaskResultItem({ task, onSelect }: { task: LauncherTask; onSelect: (value: string) => void }) {
	//
	const title = task.title ?? 'Untitled task';

	return (
		<CommandItem value={`/task/${task._id}`} keywords={[title]} onSelect={onSelect}>
			{task.isActive ? <Circle className="mr-2" /> : <CircleCheckBig className="mr-2" />}
			<span className={task.isActive ? '' : 'line-through'}>{title}</span>
		</CommandItem>
	);
}

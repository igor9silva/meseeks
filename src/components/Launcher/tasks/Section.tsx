import { Loading } from '~/components/Loading';
import { CommandGroup } from '~/components/ui/command';
import type { LauncherTask } from '../types';
import { TaskResultItem } from './TaskResultItem';

interface TasksSectionProps {
	isLoadingMore: boolean;
	onNavigate: (value: string) => void;
	tasks: LauncherTask[];
}

export function TasksSection({ isLoadingMore, onNavigate, tasks }: TasksSectionProps) {
	//
	return (
		<CommandGroup heading="Tasks">
			{tasks.map((task) => (
				<TaskResultItem key={task._id} task={task} onSelect={onNavigate} />
			))}
			{isLoadingMore && <Loading className="py-4" />}
		</CommandGroup>
	);
}

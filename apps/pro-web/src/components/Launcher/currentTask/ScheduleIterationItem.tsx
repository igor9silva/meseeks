import { CalendarClock } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';
import { useScheduleDialog } from '~/hooks/useScheduleDialog';
import { useLauncher } from '../LauncherProvider';
import type { CurrentTask } from '../types';

export function ScheduleIterationItem({ task }: { task: CurrentTask }) {
	//
	const { close } = useLauncher();
	const scheduleDialog = useScheduleDialog();
	if (!task.isActive) return null;

	const handleSelect = () => {
		//
		scheduleDialog.open(task._id);
		close();
	};

	return (
		<CommandItem keywords={['schedule', 'iteration', 'current']} onSelect={handleSelect}>
			<CalendarClock className="mr-2" />
			Schedule iteration
		</CommandItem>
	);
}

import { CalendarIcon } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function SchedulesItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	return (
		<CommandItem value="/schedules" keywords={['schedules', 'manage', 'schedule']} onSelect={onSelect}>
			<CalendarIcon className="mr-2" />
			See schedules
		</CommandItem>
	);
}

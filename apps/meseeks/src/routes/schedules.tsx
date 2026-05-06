import { createFileRoute } from '@tanstack/react-router';
import { CalendarIcon } from 'lucide-react';

import { ScheduleCard } from '~/components/schedules/ScheduleCard';
import { useSchedules } from '~/hooks/query/useSchedules';

export const Route = createFileRoute('/schedules')({
	component: SchedulesPage,
});

function SchedulesPage() {
	//
	const { schedules } = useSchedules();

	if (schedules.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-96 text-center">
				<CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">No schedules yet</h2>
				<p className="text-muted-foreground">
					Schedule task iterations from the task and you'll see them here.
				</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold">Schedules</h1>
			</div>

			<div className="space-y-4">
				{schedules.map((schedule) => (
					<ScheduleCard key={schedule._id} schedule={schedule} taskTitle={schedule.taskTitle} />
				))}
			</div>
		</div>
	);
}

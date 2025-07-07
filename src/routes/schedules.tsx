import { createFileRoute } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { Doc } from 'convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { CalendarIcon, ClockIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

import { TimeAgo } from '~/components/TimeAgo';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog';
import { useSchedules } from '~/hooks/query/useSchedules';

export const Route = createFileRoute('/schedules')({
	component: SchedulesPage,
});

type ScheduleWithTask = Doc<'schedules'> & { taskTitle: string };

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
					<ScheduleCard key={schedule._id} schedule={schedule} />
				))}
			</div>
		</div>
	);
}

function ScheduleCard({ schedule }: { schedule: ScheduleWithTask }) {
	//
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const cancelSchedule = useMutation(api.schedules.public.cancel);

	const handleCancel = async () => {
		//
		try {
			await cancelSchedule({ scheduleId: schedule._id });
			setShowCancelDialog(false);
		} catch (error) {
			console.error('Failed to cancel schedule:', error);
		}
	};

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-2">
							<ScheduleIcon scheduleType={schedule.scheduleType} />
							<CardTitle className="text-base">
								{schedule.skillKey} on{' '}
								<a href={`/task/${schedule.taskId}`} className="text-foreground hover:underline">
									{schedule.taskTitle}
								</a>
							</CardTitle>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowCancelDialog(true)}
							className="h-8 px-3 text-muted-foreground hover:text-foreground"
						>
							<XIcon className="h-4 w-4 mr-1" />
							Cancel
						</Button>
					</div>
					<div className="flex flex-wrap gap-2 pt-2">
						<Badge variant="outline" className="text-xs">
							<CalendarIcon className="mr-1 h-3 w-3" />
							<ScheduleTime schedule={schedule} />
						</Badge>
						{schedule.scheduleType === 'recurring' && (
							<Badge variant="secondary" className="text-xs">
								{schedule.cronExpression}
							</Badge>
						)}
						{schedule.lastRunAt && (
							<Badge variant="secondary" className="text-xs">
								Last run:&nbsp;
								<TimeAgo date={schedule.lastRunAt} />
							</Badge>
						)}
					</div>
				</CardHeader>
			</Card>

			<Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel Schedule</DialogTitle>
						<DialogDescription>
							Are you sure you want to cancel this schedule? This action cannot be undone and the task
							will no longer run automatically.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCancelDialog(false)}>
							Keep Schedule
						</Button>
						<Button variant="destructive" onClick={handleCancel}>
							Cancel Schedule
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function ScheduleIcon({ scheduleType }: { scheduleType: 'one-time' | 'recurring' }) {
	//
	if (scheduleType === 'one-time') {
		return <ClockIcon className="h-4 w-4 text-muted-foreground" />;
	} else {
		return <RefreshCwIcon className="h-4 w-4 text-muted-foreground" />;
	}
}

function ScheduleTime({ schedule }: { schedule: ScheduleWithTask }) {
	//
	if (schedule.scheduleType === 'one-time') {
		return <TimeAgo date={schedule.scheduledAt} suffix="from now" />;
	} else {
		return (
			<span>
				next run <TimeAgo date={schedule.nextRunAt} suffix="from now" />
			</span>
		);
	}
}

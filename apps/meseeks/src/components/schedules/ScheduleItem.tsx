import { formatDistanceToNow } from 'lib/date';
import { type Doc } from 'convex/_generated/dataModel';
import { Trash } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@reactor/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@reactor/ui/dialog';
import { useCancelSchedule } from '~/hooks/useCancelSchedule';
import { cn } from '@reactor/ui/lib/utils';
import { getScheduleInstructions } from './scheduleUtils';

export type Schedule = Doc<'schedules'>;

export function TaskScheduleCompactItem({ schedule }: { schedule: Schedule }) {
	//
	const instructions = getScheduleInstructions(schedule);

	return (
		<div className="group flex items-center gap-2 px-3 py-1" title={formatScheduleHover(schedule)}>
			<div className="min-w-0 flex-1">
				<div className="min-w-0 text-xs leading-tight">
					<TaskScheduleSentence schedule={schedule} />
				</div>
				{instructions && (
					<div className="mt-0.5 truncate text-xs leading-tight text-muted-foreground opacity-70">
						{instructions}
					</div>
				)}
			</div>
			<CancelScheduleButton schedule={schedule} />
		</div>
	);
}

function TaskScheduleSentence({ schedule }: { schedule: Schedule }) {
	//
	const relativeTime = formatRelativeScheduleTime(
		schedule.scheduleType === 'one-time' ? schedule.scheduledAt : schedule.nextRunAt,
	);

	if (schedule.scheduleType === 'one-time') {
		return (
			<>
				<span className="text-muted-foreground">scheduled to think </span>
				<span className="font-semibold text-foreground">once {relativeTime}</span>
			</>
		);
	}

	return (
		<>
			<span className="text-muted-foreground">scheduled to think recurrently ({schedule.cronExpression}), </span>
			<span className="font-semibold text-foreground">next {relativeTime}</span>
		</>
	);
}

export function CancelScheduleButton({ schedule, className }: { schedule: Schedule; className?: string }) {
	//
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const { cancelSchedule, isCancelingSchedule } = useCancelSchedule();

	const handleCancel = () => {
		//
		cancelSchedule({ scheduleId: schedule._id }, { onSuccess: () => setIsDialogOpen(false) });
	};

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				onClick={() => setIsDialogOpen(true)}
				className={cn('size-6 shrink-0 opacity-60 [&_svg]:size-2/3 hover:opacity-100', className)}
				aria-label="Cancel schedule"
				title="Cancel schedule"
			>
				<Trash />
			</Button>

			<CancelScheduleDialog
				isOpen={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				onCancel={handleCancel}
				isCanceling={isCancelingSchedule}
			/>
		</>
	);
}

function CancelScheduleDialog({
	isOpen,
	onOpenChange,
	onCancel,
	isCanceling,
}: {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onCancel: () => void;
	isCanceling: boolean;
}) {
	//
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Cancel Schedule</DialogTitle>
					<DialogDescription>
						Are you sure you want to cancel this schedule? This action cannot be undone and the task will no
						longer run automatically.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCanceling}>
						Keep Schedule
					</Button>
					<Button variant="destructive" onClick={onCancel} disabled={isCanceling}>
						Cancel Schedule
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function formatRelativeScheduleTime(timestamp: number) {
	//
	return `in ${formatDistanceToNow(new Date(timestamp))}`;
}

function formatScheduleHover(schedule: Schedule) {
	//
	const timestamp = schedule.scheduleType === 'one-time' ? schedule.scheduledAt : schedule.nextRunAt;

	return `${formatScheduleDate(timestamp, schedule.timeZone)} (${schedule.timeZone})`;
}

function formatScheduleDate(timestamp: number, timeZone: string) {
	//
	return new Date(timestamp).toLocaleString('en-US', {
		timeZone,
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

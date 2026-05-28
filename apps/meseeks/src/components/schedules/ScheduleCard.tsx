import { Link } from '@tanstack/react-router';
import { CalendarIcon, ClockIcon, RefreshCwIcon } from 'lucide-react';

import { TimeAgo } from '~/components/TimeAgo';
import { Badge } from '@reactor/ui/badge';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@reactor/ui/card';
import { CancelScheduleButton, type Schedule } from '~/components/schedules/ScheduleItem';
import { getScheduleInstructions } from '~/components/schedules/scheduleUtils';
import { cn } from '@reactor/ui/lib/utils';

export function ScheduleCard({ schedule, taskTitle }: { schedule: Schedule; taskTitle: string }) {
	//
	const instructions = getScheduleInstructions(schedule);

	return (
		<Card className="gap-1">
			<div className="flex items-center justify-between gap-3">
				<CardHeader className="pb-2 min-w-0">
					<CardTitle className="flex items-center gap-2 min-w-0">
						<ScheduleIcon scheduleType={schedule.scheduleType} />
						<Link
							to="/$"
							params={{ _splat: `task/${schedule.taskId}` }}
							className="min-w-0 flex-1 truncate text-foreground hover:underline"
							resetScroll={false}
						>
							{taskTitle}
						</Link>
					</CardTitle>

					{instructions && (
						<CardDescription>
							<p className="text-sm text-muted-foreground mt-1 break-words">{instructions}</p>
						</CardDescription>
					)}
				</CardHeader>

				<CancelScheduleButton schedule={schedule} className="mr-6" />
			</div>

			<CardFooter>
				<ScheduleBadges schedule={schedule} />
			</CardFooter>
		</Card>
	);
}

function ScheduleBadges({ schedule }: { schedule: Schedule }) {
	//
	return (
		<div className="flex flex-wrap gap-2 pt-2">
			<Badge variant="outline" className="text-xs">
				<CalendarIcon className="mr-1 h-3 w-3" />
				<ScheduleTime schedule={schedule} />
			</Badge>
			{schedule.scheduleType === 'recurring' && (
				<Badge variant="secondary" className="text-xs font-mono">
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
	);
}

function ScheduleIcon({ scheduleType, className }: { scheduleType: 'one-time' | 'recurring'; className?: string }) {
	//
	if (scheduleType === 'one-time') {
		return <ClockIcon className={cn('h-4 w-4 shrink-0 text-muted-foreground', className)} />;
	}

	return <RefreshCwIcon className={cn('h-4 w-4 shrink-0 text-muted-foreground', className)} />;
}

function ScheduleTime({ schedule }: { schedule: Schedule }) {
	//
	if (schedule.scheduleType === 'one-time') {
		return <TimeAgo date={schedule.scheduledAt} suffix="from now" />;
	}

	return (
		<span>
			next run <TimeAgo date={schedule.nextRunAt} suffix="from now" />
		</span>
	);
}

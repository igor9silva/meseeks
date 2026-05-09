import { type Id } from 'convex/_generated/dataModel';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { TaskScheduleCompactItem } from '~/components/schedules/ScheduleItem';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@reactor/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { useTaskSchedules } from '~/hooks/query/useSchedules';
import { cn } from '@reactor/ui/lib/utils';

export function TaskSchedules({ taskId }: { taskId: Id<'tasks'> }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const { schedules } = useTaskSchedules(taskId);
	const sortedSchedules = schedules.concat().sort((a, b) => a.nextRunAt - b.nextRunAt);

	if (sortedSchedules.length === 0) return null;

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className="whitespace-normal">
			<CollapsibleTrigger className="flex w-full min-w-0 items-center gap-2 rounded-lg p-3 text-left text-sm hover:bg-muted/50">
				<span className="min-w-0 flex-1 truncate font-medium text-foreground">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="cursor-help underline decoration-muted-foreground/30 underline-offset-2">
									Schedule
								</span>
							</TooltipTrigger>
							<TooltipContent className="text-xs">
								Scheduled actions to run in the future. They can be one-time or recurring
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>{' '}
					<span className="text-muted-foreground">({sortedSchedules.length})</span>
				</span>
				<ChevronDown className={cn('ml-auto size-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')} />
			</CollapsibleTrigger>
			<CollapsibleContent className="pt-1">
				<div className="space-y-0.5">
					{sortedSchedules.map((schedule) => (
						<TaskScheduleCompactItem key={schedule._id} schedule={schedule} />
					))}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

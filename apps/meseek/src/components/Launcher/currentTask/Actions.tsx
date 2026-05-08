import type { Id } from 'convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { AddEnergyItem } from './AddEnergyItem';
import { ClearEnergyItem } from './ClearEnergyItem';
import { DiscardCurrentTaskItem } from './DiscardCurrentTaskItem';
import { ReopenTaskItem } from './ReopenTaskItem';
import { ResolveCurrentTaskItem } from './ResolveCurrentTaskItem';
import { ScheduleIterationItem } from './ScheduleIterationItem';
import { StopReactionsItem } from './StopReactionsItem';

export function CurrentTaskActions({ taskId }: { taskId: Id<'tasks'> | undefined }) {
	//
	const currentTask = useQuery(api.tasks.findOne, taskId ? { taskId } : 'skip');
	if (!currentTask) return null;

	return (
		<>
			<ResolveCurrentTaskItem task={currentTask} />
			<DiscardCurrentTaskItem task={currentTask} />
			<AddEnergyItem task={currentTask} />
			<ClearEnergyItem task={currentTask} />
			<ReopenTaskItem task={currentTask} />
			<StopReactionsItem task={currentTask} />
			<ScheduleIterationItem task={currentTask} />
		</>
	);
}

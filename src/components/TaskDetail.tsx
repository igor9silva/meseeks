import { TimeAgo } from '~/components/TimeAgo';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import MDX from '~/components/ui/mdx';
import { useCurrentTask } from '~/hooks/useCurrentTask';
import { useOptimisticTaskUpdate } from '~/hooks/useOptimisticTaskUpdate';
import { useReopen, useResolve, useTaskMutations } from '~/hooks/useTaskMutations';
import { cn } from '~/lib/utils';
import { CollapsibleSummary } from './CollapsibleSummary';
import { EditableContent } from './EditableContent';
import { TaskAvailableSkills } from './TaskAvailableSkills';
import { TaskBudget } from './TaskBudget';

export default function TaskDetail({
	className, //
	showExpand = false,
}: {
	className?: string;
	showExpand?: boolean;
}) {
	const { task } = useCurrentTask();
	const { resolve, isResolving } = useResolve();
	const { reopen, isReopening } = useReopen();
	const { updateInstructions } = useTaskMutations();
	const { updateTaskStatus } = useOptimisticTaskUpdate();

	const handleCheckboxChange = (hasChecked: boolean) => {
		//
		if (isResolving || isReopening) return;

		// Optimistically update UI
		updateTaskStatus({ task, isActive: !hasChecked });

		// Execute the actual mutation
		hasChecked ? resolve({ taskId: task._id }) : reopen({ taskId: task._id });
	};

	const handleAvailableSkillsChange = (availableSkills: string[]) => {
		//
		updateInstructions({
			taskId: task._id,
			availableSkills,
		});
	};

	return (
		<Card
			className={cn(
				'whitespace-pre-wrap border-none rounded-none overflow-auto h-full justify-between flex flex-col p-4 md:p-0',
				className,
			)}
		>
			<CardHeader className="p-0 md:p-4 max-w-full sticky top-0 bg-background/75 z-10">
				<div className="flex flex-col">
					<div className="flex flex-row justify-between gap-2 items-center min-w-0">
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<Checkbox
								id={`task-checkbox-${task._id}`}
								checked={!task.isActive}
								onCheckedChange={handleCheckboxChange}
								disabled={isResolving || isReopening}
								className="flex-shrink-0"
							/>
							<EditableContent
								key={task.title}
								value={task.title ?? ''}
								onSave={(newTitle) => updateInstructions({ taskId: task._id, title: newTitle })}
								viewClassName="text-2xl font-bold leading-none break-words overflow-wrap-anywhere min-w-0 flex-1"
								asView={({ value, className, isEmpty }) => (
									<h1 className={cn(!task.isActive && 'line-through', className)}>
										{isEmpty ? <span className="text-muted-foreground">Untitled task</span> : value}
									</h1>
								)}
							/>
						</div>
					</div>
					<div className="flex items-center gap-0.5 p-2">
						<TimeAgo date={task._creationTime} suffix="old, " className="text-sm text-muted-foreground" />
						<TaskBudget task={task} className="text-sm" />
					</div>
					<TaskAvailableSkills
						availableSkills={task.availableSkills ?? []}
						onAvailableSkillsChange={handleAvailableSkillsChange}
					/>
				</div>
			</CardHeader>
			<CardContent className="p-0 md:p-4 md:pt-0 flex-grow flex flex-col">
				<EditableContent
					key={task.instructions}
					value={task.instructions ?? ''}
					onSave={(newInstructions) =>
						updateInstructions({ taskId: task._id, instructions: newInstructions })
					}
					multiline
					asView={({ value, enterEditMode, className, isEmpty }) => (
						<div className={cn(className)}>
							{isEmpty ? (
								<div className="text-muted-foreground text-sm">No instructions.</div>
							) : (
								<MDX text={value} onClickFix={enterEditMode} />
							)}
						</div>
					)}
					viewClassName="w-full h-full"
					editClassName="h-full"
				/>
				{task.summary && <CollapsibleSummary summary={task.summary} />}
			</CardContent>
		</Card>
	);
}

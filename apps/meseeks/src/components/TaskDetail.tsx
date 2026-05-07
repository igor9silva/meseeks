import { Suspense } from 'react';
import { TimeAgo } from '~/components/TimeAgo';
import { TaskSchedules } from '~/components/TaskSchedules';
import { Card, CardContent, CardHeader } from '@reactor/ui/card';
import MDX from '~/components/ui/mdx';
import { useCurrentTask } from '~/hooks/useCurrentTask';
import { useUpdateAvailableSkills, useUpdateInstructions, useUpdateTitle } from '~/hooks/useTaskMutations';
import { cn } from '@reactor/ui/lib/utils';
import { CollapsibleSummary } from './CollapsibleSummary';
import { EditableContent } from './EditableContent';
import { TaskAvailableSkills } from './TaskAvailableSkills';

export default function TaskDetail({
	className, //
}: {
	className?: string;
}) {
	//
	const { task } = useCurrentTask();
	const { updateTitle, isUpdatingTitle } = useUpdateTitle();
	const { updateInstructions, isUpdatingInstructions } = useUpdateInstructions();
	const { updateAvailableSkills, isUpdatingAvailableSkills } = useUpdateAvailableSkills();

	const handleAvailableSkillsChange = (availableSkills: string[]) => {
		//
		if (isUpdatingAvailableSkills) return;
		updateAvailableSkills({
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
			<CardHeader className="p-4 max-w-full top-0 z-10">
				<div className="flex flex-col">
					<div className="flex flex-row justify-between gap-2 items-center min-w-0">
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<EditableContent
								key={task.title}
								value={task.title ?? ''}
								onSave={(newTitle) => updateTitle({ taskId: task._id, title: newTitle })}
								isPending={isUpdatingTitle}
								viewClassName="text-base md:text-xl font-bold leading-none break-words overflow-wrap-anywhere min-w-0 flex-1"
								asView={({ value, className, isEmpty, isPending }) => (
									<h1
										className={cn(
											!task.isActive && 'line-through',
											isPending && 'opacity-50',
											className,
										)}
									>
										{isEmpty ? (
											<span className="text-muted-foreground italic">
												Double tap to set a title
											</span>
										) : (
											value
										)}
									</h1>
								)}
							/>
						</div>
					</div>
					<div className="flex items-center gap-0.5">
						<TimeAgo date={task._creationTime} suffix="old" className="text-sm text-muted-foreground" />
					</div>
				</div>
				<TaskAvailableSkills
					availableSkills={task.availableSkills ?? []}
					onAvailableSkillsChange={handleAvailableSkillsChange}
					isPending={isUpdatingAvailableSkills}
				/>
			</CardHeader>
			<CardContent className="px-4 py-0 flex-grow flex flex-col">
				<EditableContent
					key={task.instructions}
					value={task.instructions ?? ''}
					onSave={(newInstructions) =>
						updateInstructions({ taskId: task._id, instructions: newInstructions })
					}
					isPending={isUpdatingInstructions}
					multiline
					asView={({ value, enterEditMode, className, isEmpty, isPending }) => (
						<div className={cn(isPending && 'opacity-50', className)}>
							{isEmpty ? (
								<div className="text-muted-foreground text-sm italic">Double tap to edit plan</div>
							) : (
								<MDX text={value} onClickFix={enterEditMode} />
							)}
						</div>
					)}
					viewClassName="w-full h-full"
					editClassName="h-full"
				/>
				<Suspense>
					<TaskSchedules taskId={task._id} />
				</Suspense>
				{task.summary && <CollapsibleSummary summary={task.summary} />}
			</CardContent>
		</Card>
	);
}

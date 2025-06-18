import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { useState } from 'react';
import { TimeAgo } from '~/components/TimeAgo';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import MDX from '~/components/ui/mdx';
import { Separator } from '~/components/ui/separator';
import { useOptimisticTaskUpdate } from '~/hooks/useOptimisticTaskUpdate';
import { useTaskMutations } from '~/hooks/useTaskMutations';
import { cn } from '~/lib/utils';
import { EditableContent } from './EditableContent';
import { MonacoDemo } from './MonacoDemo';
import { MonacoEditableContent } from './MonacoEditor';
import { MonacoErrorBoundary } from './MonacoErrorBoundary';
import { TaskBudget } from './TaskBudget';

export default function TaskDetail({
	taskId,
	className, //
	showExpand = false,
}: {
	taskId: Id<'tasks'>;
	className?: string;
	showExpand?: boolean;
}) {
	const query = convexQuery(api.tasks.public.findOne, { taskId });
	const { data: task } = useSuspenseQuery(query);
	const { updateInstructions, resolve, reopen } = useTaskMutations();
	const { updateTaskStatus } = useOptimisticTaskUpdate();
	const [useMonaco, setUseMonaco] = useState(false);
	const [showDemo, setShowDemo] = useState(false);
	const [showDiff, setShowDiff] = useState(false);

	// store original instructions for diff comparison
	const [originalInstructions] = useState(task.instructions ?? '');

	const handleCheckboxChange = (hasChecked: boolean) => {
		//
		// Optimistically update UI
		updateTaskStatus({ task, isActive: !hasChecked });

		// Execute the actual mutation
		hasChecked ? resolve({ taskId: task._id }) : reopen({ taskId: task._id });
	};

	if (showDemo) {
		return (
			<div>
				<div className="flex items-center gap-2 p-4">
					<Button variant="outline" onClick={() => setShowDemo(false)}>
						← Back to Task
					</Button>
					<h2 className="text-xl font-semibold">Monaco Editor Demo</h2>
				</div>
				<MonacoDemo />
			</div>
		);
	}

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
					<div className="flex items-center gap-2 p-2">
						<TimeAgo date={task._creationTime} suffix="old, " className="text-sm text-muted-foreground" />
						<TaskBudget task={task} className="text-sm" />
						<Separator orientation="vertical" className="h-4" />
						<div className="flex gap-1">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setUseMonaco(!useMonaco)}
								className="text-xs"
							>
								{useMonaco ? 'Simple' : 'Monaco'}
							</Button>
							{useMonaco && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowDiff(!showDiff)}
									className="text-xs"
								>
									{showDiff ? 'Edit' : 'Diff'}
								</Button>
							)}
							<Button variant="outline" size="sm" onClick={() => setShowDemo(true)} className="text-xs">
								Demo
							</Button>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-0 md:p-4 md:pt-0 flex-grow">
				{useMonaco ? (
					<MonacoErrorBoundary
						fallback={
							<div className="p-4 border rounded-lg bg-muted/20">
								<p className="text-sm text-muted-foreground mb-2">Monaco Editor failed to load.</p>
								<Button size="sm" onClick={() => setUseMonaco(false)}>
									Switch to Simple Editor
								</Button>
							</div>
						}
					>
						<MonacoEditableContent
							key={task.instructions}
							value={task.instructions ?? ''}
							onSave={(newInstructions) =>
								updateInstructions({ taskId: task._id, instructions: newInstructions })
							}
							language="markdown"
							showDiff={showDiff}
							originalValue={originalInstructions}
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
							options={{
								wordWrap: 'on',
								lineNumbers: showDiff ? 'on' : 'off',
								minimap: { enabled: showDiff },
							}}
						/>
					</MonacoErrorBoundary>
				) : (
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
				)}
			</CardContent>
			{/* {task.summary && (
				<>
					<Separator />
					<CardFooter className="p-0 md:p-4 ">
						<MDX text={task.summary} />
					</CardFooter>
				</>
			)} */}
		</Card>
	);
}

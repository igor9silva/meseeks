import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';
import { TimeAgo } from '~/components/TimeAgo';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { LoadingCheckbox } from '~/components/ui/loading-checkbox';
import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import MDX from '~/components/ui/mdx';
import { useTaskAncestors } from '~/hooks/query/useTaskAncestors';
import { useCurrentTask } from '~/hooks/useCurrentTask';
import {
	useReopen,
	useResolve,
	useUpdateAvailableSkills,
	useUpdateInstructions,
	useUpdateTitle,
} from '~/hooks/useTaskMutations';
import { cn } from '~/lib/utils';
import { CollapsibleSummary } from './CollapsibleSummary';
import { EditableContent } from './EditableContent';
import { TaskAvailableSkills } from './TaskAvailableSkills';

export default function TaskDetail({
	className, //
	showExpand = false,
}: {
	className?: string;
	showExpand?: boolean;
}) {
	const { task } = useCurrentTask();
	const { ancestors } = useTaskAncestors(task._id);
	const { resolve, isResolving } = useResolve();
	const { reopen, isReopening } = useReopen();
	const { updateTitle, isUpdatingTitle } = useUpdateTitle();
	const { updateInstructions, isUpdatingInstructions } = useUpdateInstructions();
	const { updateAvailableSkills, isUpdatingAvailableSkills } = useUpdateAvailableSkills();

	const handleCheckboxChange = (hasChecked: boolean) => {
		//
		if (isResolving || isReopening) return;

		hasChecked ? resolve({ taskId: task._id }) : reopen({ taskId: task._id });
	};

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
			<CardHeader className="p-0 md:p-4 max-w-full sticky top-0 bg-background/75 z-10">
				<div className="flex flex-col">
					{ancestors.length > 0 && (
						<TaskBreadcrumbs ancestors={ancestors} currentTitle={task.title} />
					)}
					<div className="flex flex-row justify-between gap-2 items-center min-w-0">
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<LoadingCheckbox
								id={`task-checkbox-${task._id}`}
								checked={!task.isActive}
								onCheckedChange={handleCheckboxChange}
								loading={isResolving || isReopening}
								className="flex-shrink-0"
							/>
							<EditableContent
								key={task.title}
								value={task.title ?? ''}
								onSave={(newTitle) => updateTitle({ taskId: task._id, title: newTitle })}
								isPending={isUpdatingTitle}
								viewClassName="text-2xl font-bold leading-none break-words overflow-wrap-anywhere min-w-0 flex-1"
								asView={({ value, className, isEmpty, isPending }) => (
									<h1
										className={cn(
											!task.isActive && 'line-through',
											isPending && 'opacity-50',
											className,
										)}
									>
										{isEmpty ? <span className="text-muted-foreground">Untitled task</span> : value}
									</h1>
								)}
							/>
						</div>
					</div>
					<div className="flex items-center gap-0.5 p-2">
						<TimeAgo date={task._creationTime} suffix="old" className="text-sm text-muted-foreground" />
					</div>
					<TaskAvailableSkills
						availableSkills={task.availableSkills ?? []}
						onAvailableSkillsChange={handleAvailableSkillsChange}
						isPending={isUpdatingAvailableSkills}
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
					isPending={isUpdatingInstructions}
					multiline
					asView={({ value, enterEditMode, className, isEmpty, isPending }) => (
						<div className={cn(isPending && 'opacity-50', className)}>
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

function TaskBreadcrumbs({
	ancestors,
	currentTitle,
}: {
	ancestors: { _id: string; title?: string | null }[];
	currentTitle?: string | null;
}) {
	//
	const maxVisible = 4;
	const items =
		ancestors.length > maxVisible
			? [ancestors[0], 'ellipsis', ...ancestors.slice(-2)]
			: ancestors;

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{items.map((item, index) => {
					if (item === 'ellipsis') {
						return (
							<Fragment key={`ellipsis-${index}`}>
								<BreadcrumbItem>
									<BreadcrumbEllipsis />
								</BreadcrumbItem>
								<BreadcrumbSeparator />
							</Fragment>
						);
					}

					const ancestor = item;
					return (
						<Fragment key={ancestor._id}>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link to="/$" params={{ _splat: `task/${ancestor._id}` }} resetScroll={false}>
										{ancestor.title ?? 'Untitled task'}
									</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
						</Fragment>
					);
				})}
				<BreadcrumbItem>
					<BreadcrumbPage>{currentTitle ?? 'Untitled task'}</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}

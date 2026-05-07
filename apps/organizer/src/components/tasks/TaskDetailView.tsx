import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Check, FolderInput, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Mdx } from '~/components/ui/mdx';
import { markTaskDone, moveTask, renameTask, updateTaskTags, updateTaskTitle } from '~/server/taskExplorer';
import type { TaskDetailResult, TaskDetailTask } from './taskExplorerTypes';
import {
	createTaskRenameFilename,
	getMutationErrorMessage,
	getTaskFileBasename,
	toCodexTaskHref,
	toCursorFileHref,
	toCursorTaskHref,
} from './taskExplorerUtils';

export function TaskDetailView({
	detail,
	statusOptions,
	onNavigateTask,
	onTaskMoved,
	onTaskRenamed,
	onTaskCompleted,
}: {
	detail: TaskDetailResult;
	statusOptions: string[];
	onNavigateTask: (taskKey: string) => void;
	onTaskMoved: (taskKey: string, status: string) => void;
	onTaskRenamed: (taskKey: string) => void;
	onTaskCompleted: (taskKey: string) => void;
}) {
	//
	if (!detail.task) return null;

	return (
		<TaskDetailContent
			key={detail.task.key}
			detail={detail}
			task={detail.task}
			statusOptions={statusOptions}
			onNavigateTask={onNavigateTask}
			onTaskMoved={onTaskMoved}
			onTaskRenamed={onTaskRenamed}
			onTaskCompleted={onTaskCompleted}
		/>
	);
}

function TaskDetailContent({
	detail,
	task,
	statusOptions,
	onNavigateTask,
	onTaskMoved,
	onTaskRenamed,
	onTaskCompleted,
}: {
	detail: TaskDetailResult;
	task: TaskDetailTask;
	statusOptions: string[];
	onNavigateTask: (taskKey: string) => void;
	onTaskMoved: (taskKey: string, status: string) => void;
	onTaskRenamed: (taskKey: string) => void;
	onTaskCompleted: (taskKey: string) => void;
}) {
	//
	const tagInputId = useId();
	const moveStatusInputId = useId();
	const renameFilenameInputId = useId();
	const titleInputId = useId();
	const renameFilenameInputRef = useRef<HTMLInputElement>(null);
	const titleInputRef = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const markTaskDoneServer = useServerFn(markTaskDone);
	const moveTaskServer = useServerFn(moveTask);
	const renameTaskServer = useServerFn(renameTask);
	const updateTaskTagsServer = useServerFn(updateTaskTags);
	const updateTaskTitleServer = useServerFn(updateTaskTitle);
	const relatedTasks = detail.relatedTasks ?? [];
	const relatedTaskByKey = new Map(relatedTasks.map((relatedTask) => [relatedTask.key, relatedTask]));
	const cursorFileHref = toCursorFileHref(task.absolutePath);
	const cursorTaskHref = toCursorTaskHref(task);
	const codexTaskHref = toCodexTaskHref(task);
	const canMarkDone = task.status !== 'completed';
	const currentFileBasename = useMemo(() => getTaskFileBasename(task.relativePath), [task.relativePath]);
	const [tagDraft, setTagDraft] = useState('');
	const [isMoveOpen, setIsMoveOpen] = useState(false);
	const [moveStatus, setMoveStatus] = useState('');
	const [isRenamingFile, setIsRenamingFile] = useState(false);
	const [renameDraft, setRenameDraft] = useState('');
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [titleDraft, setTitleDraft] = useState('');

	useEffect(() => {
		if (isRenamingFile) renameFilenameInputRef.current?.focus();
	}, [isRenamingFile]);

	useEffect(() => {
		if (isEditingTitle) titleInputRef.current?.focus();
	}, [isEditingTitle]);
	const moveStatusOptions = useMemo(() => {
		return statusOptions.filter((statusOption) => statusOption !== task.status);
	}, [statusOptions, task.status]);
	const normalizedRenameFilename = useMemo(() => createTaskRenameFilename(renameDraft), [renameDraft]);
	const markTaskDoneMutation = useMutation({
		mutationFn: () => markTaskDoneServer({ data: { taskKey: task.key } }),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			onTaskCompleted(result.newTaskKey);
		},
	});
	const moveTaskMutation = useMutation({
		mutationFn: (status: string) => moveTaskServer({ data: { taskKey: task.key, status } }),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			setIsMoveOpen(false);
			onTaskMoved(result.newTaskKey, result.status);
		},
	});
	const renameTaskMutation = useMutation({
		mutationFn: (filename: string) => renameTaskServer({ data: { taskKey: task.key, filename } }),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			setIsRenamingFile(false);
			setRenameDraft('');
			onTaskRenamed(result.newTaskKey);
		},
	});
	const updateTaskTitleMutation = useMutation({
		mutationFn: (title: string) => updateTaskTitleServer({ data: { taskKey: task.key, title } }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			setIsEditingTitle(false);
			setTitleDraft('');
		},
	});
	const updateTaskTagsMutation = useMutation({
		mutationFn: ({ action, tag }: { action: 'add' | 'remove'; tag: string }) =>
			updateTaskTagsServer({ data: { taskKey: task.key, action, tag } }),
		onSuccess: async (_, variables) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			if (variables.action === 'add') {
				setTagDraft('');
			}
		},
	});

	const handleTagSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (tagDraft.trim().length === 0) return;

		updateTaskTagsMutation.mutate({
			action: 'add',
			tag: tagDraft,
		});
	};

	const handleTagRemove = (tag: string) => {
		updateTaskTagsMutation.mutate({
			action: 'remove',
			tag,
		});
	};

	const handleMoveSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (moveStatus.trim().length === 0) return;

		moveTaskMutation.mutate(moveStatus);
	};

	const handleRenameStart = () => {
		setIsMoveOpen(false);
		setIsEditingTitle(false);
		setTitleDraft('');
		setRenameDraft(currentFileBasename);
		setIsRenamingFile(true);
	};

	const handleRenameCancel = () => {
		setIsRenamingFile(false);
		setRenameDraft('');
	};

	const handleRenameSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedRenameDraft = renameDraft.trim();

		if (trimmedRenameDraft.length === 0) return;
		if (trimmedRenameDraft === currentFileBasename) {
			handleRenameCancel();
			return;
		}
		if (normalizedRenameFilename.length === 0) return;
		if (normalizedRenameFilename === currentFileBasename) {
			handleRenameCancel();
			return;
		}

		renameTaskMutation.mutate(normalizedRenameFilename);
	};

	const handleTitleEditStart = () => {
		setIsMoveOpen(false);
		setIsRenamingFile(false);
		setRenameDraft('');
		setTitleDraft(task.title);
		setIsEditingTitle(true);
	};

	const handleTitleEditCancel = () => {
		setIsEditingTitle(false);
		setTitleDraft('');
	};

	const handleTitleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedTitle = titleDraft.trim().replace(/\s+/g, ' ');

		if (trimmedTitle.length === 0) return;
		if (trimmedTitle === task.title) {
			handleTitleEditCancel();
			return;
		}

		updateTaskTitleMutation.mutate(trimmedTitle);
	};

	const renderRelation = (label: string, keys: string[]) => {
		if (keys.length === 0) return null;

		return (
			<div className="space-y-1">
				<div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
				<div className="space-y-1">
					{keys.map((key) => {
						const related = relatedTaskByKey.get(key);
						const title = related?.title ?? key;

						return (
							<button
								key={key}
								type="button"
								onClick={() => onNavigateTask(key)}
								className="block w-full cursor-pointer rounded-md border border-border px-2 py-1 text-left text-sm hover:bg-muted"
							>
								<div className="font-medium">{title}</div>
								<div className="break-all text-xs text-muted-foreground">{key}</div>
							</button>
						);
					})}
				</div>
			</div>
		);
	};

	const isTaskFileMutationPending =
		markTaskDoneMutation.isPending ||
		moveTaskMutation.isPending ||
		renameTaskMutation.isPending ||
		updateTaskTitleMutation.isPending;
	const isRenameSubmitDisabled =
		renameTaskMutation.isPending ||
		renameDraft.trim().length === 0 ||
		normalizedRenameFilename.length === 0 ||
		renameDraft.trim() === currentFileBasename ||
		normalizedRenameFilename === currentFileBasename;
	const isTitleSubmitDisabled =
		updateTaskTitleMutation.isPending ||
		titleDraft.trim().length === 0 ||
		titleDraft.trim().replace(/\s+/g, ' ') === task.title;

	return (
		<div className="h-full overflow-auto">
			<header className="flex flex-col gap-0 border-b border-border p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
							{isEditingTitle ? (
								<form className="flex min-w-0 items-center gap-1" onSubmit={handleTitleSubmit}>
									<label className="sr-only" htmlFor={titleInputId}>
										Title
									</label>
									<Input
										ref={titleInputRef}
										id={titleInputId}
										value={titleDraft}
										onChange={(event) => setTitleDraft(event.currentTarget.value)}
										onKeyDown={(event) => {
											if (event.key === 'Escape') handleTitleEditCancel();
										}}
										disabled={updateTaskTitleMutation.isPending}
										autoComplete="off"
										className="h-8 min-w-64 text-base font-semibold md:text-xl"
									/>
									<Button
										type="submit"
										size="xs"
										variant="secondary"
										aria-label="Save title"
										disabled={isTitleSubmitDisabled}
									>
										<Check className="size-3" />
									</Button>
									<Button
										type="button"
										size="xs"
										variant="ghost"
										aria-label="Cancel title edit"
										onClick={handleTitleEditCancel}
										disabled={updateTaskTitleMutation.isPending}
									>
										<X className="size-3" />
									</Button>
								</form>
							) : (
								<h2 className="min-w-0 text-xl font-semibold">
									<button
										type="button"
										onDoubleClick={handleTitleEditStart}
										className="break-words text-left hover:underline hover:underline-offset-4"
									>
										{task.title}
									</button>
								</h2>
							)}
							{isRenamingFile ? (
								<form className="flex min-w-0 items-center gap-1" onSubmit={handleRenameSubmit}>
									<label className="sr-only" htmlFor={renameFilenameInputId}>
										Filename
									</label>
									<Input
										ref={renameFilenameInputRef}
										id={renameFilenameInputId}
										value={renameDraft}
										onChange={(event) => setRenameDraft(event.currentTarget.value)}
										onKeyDown={(event) => {
											if (event.key === 'Escape') handleRenameCancel();
										}}
										disabled={renameTaskMutation.isPending}
										autoComplete="off"
										className="h-7 w-64 max-w-full text-sm"
									/>
									<Button
										type="submit"
										size="xs"
										variant="secondary"
										aria-label="Save filename"
										disabled={isRenameSubmitDisabled}
									>
										<Check className="size-3" />
									</Button>
									<Button
										type="button"
										size="xs"
										variant="ghost"
										aria-label="Cancel filename rename"
										onClick={handleRenameCancel}
										disabled={renameTaskMutation.isPending}
									>
										<X className="size-3" />
									</Button>
								</form>
							) : (
								<button
									type="button"
									onDoubleClick={handleRenameStart}
									className="break-all text-left text-sm text-muted-foreground hover:underline hover:underline-offset-4"
								>
									{task.id}
								</button>
							)}
						</div>
					</div>

					<div className="flex shrink-0 flex-wrap justify-end gap-2">
						<div className="relative">
							<Button
								type="button"
								size="sm"
								variant="outline"
								aria-expanded={isMoveOpen}
								onClick={() => {
									setIsMoveOpen(!isMoveOpen);
									setMoveStatus('');
								}}
								disabled={isTaskFileMutationPending}
							>
								<FolderInput className="size-4" />
								Move
							</Button>
							{isMoveOpen ? (
								<div className="absolute right-0 z-50 mt-1 w-72 rounded-md border border-border bg-popover p-1 text-sm shadow-md">
									<div className="max-h-56 overflow-auto">
										{moveStatusOptions.map((statusOption) => (
											<button
												key={statusOption}
												type="button"
												onClick={() => moveTaskMutation.mutate(statusOption)}
												disabled={moveTaskMutation.isPending}
												className="block w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
											>
												{statusOption}
											</button>
										))}
										{moveStatusOptions.length === 0 ? (
											<div className="px-2 py-1.5 text-muted-foreground">No other statuses</div>
										) : null}
									</div>
									<form
										className="mt-1 flex gap-2 border-t border-border pt-2"
										onSubmit={handleMoveSubmit}
									>
										<label className="sr-only" htmlFor={moveStatusInputId}>
											New status
										</label>
										<Input
											id={moveStatusInputId}
											value={moveStatus}
											onChange={(event) => setMoveStatus(event.currentTarget.value)}
											placeholder="new status"
											disabled={moveTaskMutation.isPending}
											className="h-8"
										/>
										<Button
											type="submit"
											size="sm"
											disabled={
												moveTaskMutation.isPending ||
												moveStatus.trim().length === 0 ||
												moveStatus.trim() === task.status
											}
										>
											{moveTaskMutation.isPending ? 'Moving...' : 'Move'}
										</Button>
									</form>
								</div>
							) : null}
						</div>
						{canMarkDone ? (
							<Button
								type="button"
								size="sm"
								variant="secondary"
								onClick={() => markTaskDoneMutation.mutate()}
								disabled={isTaskFileMutationPending}
							>
								<Check className="size-4" />
								{markTaskDoneMutation.isPending ? 'Marking done...' : 'Mark done'}
							</Button>
						) : null}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 break-all text-xs text-muted-foreground">
					{cursorFileHref ? (
						<a
							href={cursorFileHref}
							target="_blank"
							rel="noopener noreferrer"
							className="cursor-pointer underline underline-offset-4 hover:text-foreground"
						>
							{task.relativePath}
						</a>
					) : (
						<span>{task.relativePath}</span>
					)}
					<a
						href={cursorTaskHref}
						target="_blank"
						rel="noopener noreferrer"
						className="cursor-pointer underline underline-offset-4 hover:text-foreground"
					>
						Open in Cursor
					</a>
					<a
						href={codexTaskHref}
						target="_blank"
						rel="noopener noreferrer"
						className="cursor-pointer underline underline-offset-4 hover:text-foreground"
					>
						Open in Codex
					</a>
				</div>

				<div className="mt-3 space-y-2">
					<div className="text-xs uppercase tracking-wide text-muted-foreground">Tags</div>
					<div className="flex flex-wrap gap-1">
						{task.tags.map((tag) => (
							<Button
								key={tag}
								type="button"
								size="xs"
								variant="outline"
								onClick={() => handleTagRemove(tag)}
								disabled={updateTaskTagsMutation.isPending}
								className="gap-1"
							>
								<span>#{tag}</span>
								<X className="size-3" />
							</Button>
						))}
						{task.tags.length === 0 && <div className="text-xs text-muted-foreground">No tags yet.</div>}
					</div>
					<form className="flex gap-2" onSubmit={handleTagSubmit}>
						<label className="sr-only" htmlFor={tagInputId}>
							Add tag
						</label>
						<Input
							id={tagInputId}
							value={tagDraft}
							onChange={(event) => setTagDraft(event.currentTarget.value)}
							placeholder="add tag"
							disabled={updateTaskTagsMutation.isPending}
						/>
						<Button
							type="submit"
							size="sm"
							variant="secondary"
							disabled={updateTaskTagsMutation.isPending || tagDraft.trim().length === 0}
						>
							{updateTaskTagsMutation.isPending ? 'Saving...' : 'Add tag'}
						</Button>
					</form>
				</div>

				<div className="mt-2 flex flex-wrap gap-2 text-xs">
					<span className="rounded-md border border-border px-2 py-1">{task.taskSource}</span>
					<span className="rounded-md border border-border px-2 py-1">{task.status}</span>
					{task.priority && (
						<span className="rounded-md border border-border px-2 py-1">{task.priority}</span>
					)}
				</div>

				{markTaskDoneMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{getMutationErrorMessage(markTaskDoneMutation.error, 'failed to mark task as done')}
					</div>
				) : null}
				{moveTaskMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{getMutationErrorMessage(moveTaskMutation.error, 'failed to move task')}
					</div>
				) : null}
				{renameTaskMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{getMutationErrorMessage(renameTaskMutation.error, 'failed to rename task file')}
					</div>
				) : null}
				{updateTaskTitleMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{getMutationErrorMessage(updateTaskTitleMutation.error, 'failed to update task title')}
					</div>
				) : null}
				{updateTaskTagsMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{getMutationErrorMessage(updateTaskTagsMutation.error, 'failed to update task tags')}
					</div>
				) : null}
			</header>

			<div className="space-y-4 p-4">
				<div className="grid gap-4 md:grid-cols-2">
					{detail.relations.parentKey && renderRelation('Parent', [detail.relations.parentKey])}
					{renderRelation('Children', detail.relations.children)}
				</div>

				<Mdx text={task.body} className="text-sm" />

				{task.warnings.length > 0 && (
					<details className="rounded-md border border-border/60 bg-muted/20 p-2 text-xs text-muted-foreground">
						<summary className="cursor-pointer font-medium">Warnings ({task.warnings.length})</summary>
						<ul className="mt-2 list-disc space-y-1 pl-5">
							{task.warnings.map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
					</details>
				)}
			</div>
		</div>
	);
}

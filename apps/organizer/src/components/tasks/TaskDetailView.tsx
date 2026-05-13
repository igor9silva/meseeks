import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Check, Crosshair, ListChecks, Maximize2, Minimize2, Trash2, X } from 'lucide-react';
import type { FormEvent, MouseEvent, PointerEvent } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Mdx } from '~/components/ui/mdx';
import { formatTaskBucketLabel } from '~/lib/taskBuckets';
import { compareTagGroupKeys, formatTagGroupLabel, getTagGroupLookupKey, parseTaskTag } from '~/lib/taskTags';
import {
	markTaskDone,
	moveTask,
	renameTask,
	trashTask,
	updateTaskPriority,
	updateTaskTags,
	updateTaskTitle,
} from '~/server/taskExplorer';
import type { TaskDetailResult, TaskDetailTask } from './taskExplorerTypes';
import {
	createTaskRenameFilename,
	dedupeStrings,
	formatSourceLabel,
	getMutationErrorMessage,
	getTaskFileBasename,
	getTaskFilename,
	parseTaskPriority,
	taskPriorityOptions,
	toCodexPlanHref,
	toCodexSeekHref,
	toCursorFileHref,
} from './taskExplorerUtils';

const HOLD_ACTION_DELAY_MS = 550;

function getDirectoryPath(filePath: string | null): string | null {
	//
	if (!filePath) return null;

	const normalizedPath = filePath.replaceAll('\\', '/');
	const lastSeparatorIndex = normalizedPath.lastIndexOf('/');
	if (lastSeparatorIndex <= 0) return null;

	return normalizedPath.slice(0, lastSeparatorIndex);
}

export function TaskDetailView({
	detail,
	isInspectorExpanded,
	statusOptions,
	tagOptions,
	onInspectorExpandedToggle,
	onNavigateTask,
	onTaskMoved,
	onTaskRenamed,
	onTaskCompleted,
	onTaskTrashed,
}: {
	detail: TaskDetailResult;
	isInspectorExpanded: boolean;
	statusOptions: string[];
	tagOptions: string[];
	onInspectorExpandedToggle: () => void;
	onNavigateTask: (taskKey: string) => void;
	onTaskMoved: (taskKey: string, status: string) => void;
	onTaskRenamed: (taskKey: string) => void;
	onTaskCompleted: (taskKey: string) => void;
	onTaskTrashed: (taskKey: string) => void;
}) {
	//
	if (!detail.task) return null;

	return (
		<TaskDetailContent
			key={detail.task.key}
			detail={detail}
			task={detail.task}
			isInspectorExpanded={isInspectorExpanded}
			statusOptions={statusOptions}
			tagOptions={tagOptions}
			onInspectorExpandedToggle={onInspectorExpandedToggle}
			onNavigateTask={onNavigateTask}
			onTaskMoved={onTaskMoved}
			onTaskRenamed={onTaskRenamed}
			onTaskCompleted={onTaskCompleted}
			onTaskTrashed={onTaskTrashed}
		/>
	);
}

function TaskDetailContent({
	detail,
	task,
	isInspectorExpanded,
	statusOptions,
	tagOptions,
	onInspectorExpandedToggle,
	onNavigateTask,
	onTaskMoved,
	onTaskRenamed,
	onTaskCompleted,
	onTaskTrashed,
}: {
	detail: TaskDetailResult;
	task: TaskDetailTask;
	isInspectorExpanded: boolean;
	statusOptions: string[];
	tagOptions: string[];
	onInspectorExpandedToggle: () => void;
	onNavigateTask: (taskKey: string) => void;
	onTaskMoved: (taskKey: string, status: string) => void;
	onTaskRenamed: (taskKey: string) => void;
	onTaskCompleted: (taskKey: string) => void;
	onTaskTrashed: (taskKey: string) => void;
}) {
	//
	const bucketInputId = useId();
	const priorityInputId = useId();
	const renameFilenameInputId = useId();
	const titleInputId = useId();
	const renameFilenameInputRef = useRef<HTMLInputElement>(null);
	const titleInputRef = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const markTaskDoneServer = useServerFn(markTaskDone);
	const moveTaskServer = useServerFn(moveTask);
	const renameTaskServer = useServerFn(renameTask);
	const trashTaskServer = useServerFn(trashTask);
	const updateTaskPriorityServer = useServerFn(updateTaskPriority);
	const updateTaskTagsServer = useServerFn(updateTaskTags);
	const updateTaskTitleServer = useServerFn(updateTaskTitle);
	const relatedTasks = detail.relatedTasks ?? [];
	const relatedTaskByKey = new Map(relatedTasks.map((relatedTask) => [relatedTask.key, relatedTask]));
	const cursorFileHref = toCursorFileHref(task.absolutePath);
	const codexPlanHref = toCodexPlanHref(task);
	const codexSeekHref = toCodexSeekHref(task);
	const taskAssetBasePath = useMemo(() => getDirectoryPath(task.absolutePath), [task.absolutePath]);
	const canMarkDone = task.status !== 'completed';
	const currentFilename = useMemo(() => getTaskFilename(task.relativePath), [task.relativePath]);
	const currentFileBasename = useMemo(() => getTaskFileBasename(task.relativePath), [task.relativePath]);
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
	const systemTags = useMemo(() => dedupeStrings(task.tags.concat(tagOptions)), [tagOptions, task.tags]);
	const systemTagGroups = useMemo(() => buildSystemTagGroups(systemTags), [systemTags]);
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
	const trashTaskMutation = useMutation({
		mutationFn: () => trashTaskServer({ data: { taskKey: task.key } }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			onTaskTrashed(task.key);
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
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);
		},
	});
	const updateTaskPriorityMutation = useMutation({
		mutationFn: (priority: NonNullable<TaskDetailTask['priority']>) =>
			updateTaskPriorityServer({ data: { taskKey: task.key, priority } }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);
		},
	});

	const handleTagToggle = (tag: string) => {
		updateTaskTagsMutation.mutate({
			action: task.tags.includes(tag) ? 'remove' : 'add',
			tag,
		});
	};

	const handlePriorityChange = (value: string) => {
		const parsedPriority = parseTaskPriority(value);

		if (parsedPriority === null) return;
		if (parsedPriority === task.priority) return;

		updateTaskPriorityMutation.mutate(parsedPriority);
	};

	const handleBucketChange = (status: string) => {
		if (status.trim().length === 0) return;
		if (status === task.status) return;

		moveTaskMutation.mutate(status);
	};

	const handleTimestampCopy = async (value: string) => {
		if (!navigator.clipboard) return;
		await navigator.clipboard.writeText(value);
	};

	const handleRenameStart = () => {
		setIsEditingTitle(false);
		setTitleDraft('');
		setRenameDraft(currentFilename);
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
		if (trimmedRenameDraft === currentFilename) {
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
	const isTaskFileMutationPending =
		markTaskDoneMutation.isPending ||
		moveTaskMutation.isPending ||
		renameTaskMutation.isPending ||
		trashTaskMutation.isPending ||
		updateTaskPriorityMutation.isPending ||
		updateTaskTitleMutation.isPending;
	const titleHoldAction = useHoldAction(handleTitleEditStart, isTaskFileMutationPending || isEditingTitle);
	const filenameHoldAction = useHoldAction(handleRenameStart, isTaskFileMutationPending || isRenamingFile);

	const handleFilenameClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (!filenameHoldAction.shouldSuppressClick()) return;
		event.preventDefault();
	};

	const renderRelation = (label: string, keys: string[]) => {
		if (keys.length === 0) return null;

		return (
			<div className="min-w-0 space-y-1">
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
								className="block w-full max-w-full min-w-0 cursor-pointer overflow-hidden rounded-md border border-border/80 px-2 py-1 text-left text-sm hover:bg-muted"
							>
								<div className="min-w-0 truncate font-medium text-foreground">{title}</div>
								<div className="truncate text-xs text-muted-foreground">{key}</div>
							</button>
						);
					})}
				</div>
			</div>
		);
	};

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
		<div className="h-full overflow-auto bg-background text-foreground">
			<header className="flex flex-col gap-3 border-b border-border/80 p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<div className="min-w-0">
							{isEditingTitle ? (
								<form className="flex min-w-0 flex-1 items-center gap-1" onSubmit={handleTitleSubmit}>
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
										className="h-9 min-w-64 flex-1 text-base font-semibold md:text-xl"
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
								<div className="min-w-0">
									<h2 className="inline text-xl font-semibold leading-7">
										<button
											type="button"
											onPointerDown={titleHoldAction.handlePointerDown}
											onPointerUp={titleHoldAction.handlePointerEnd}
											onPointerLeave={titleHoldAction.handlePointerEnd}
											onPointerCancel={titleHoldAction.handlePointerEnd}
											disabled={isTaskFileMutationPending}
											title="Hold to edit title"
											className="inline break-all text-left text-foreground hover:underline hover:underline-offset-4 disabled:cursor-default disabled:hover:no-underline"
										>
											{task.title}
										</button>
									</h2>
									<span className="ml-2 inline-flex items-center gap-2 align-baseline">
										<a
											href={codexPlanHref}
											target="_blank"
											rel="noopener"
											className="inline-flex items-center gap-1 text-xs font-normal text-foreground/80 underline underline-offset-4 hover:text-foreground"
										>
											<ListChecks className="size-3.5" /> Plan
										</a>
										<a
											href={codexSeekHref}
											target="_blank"
											rel="noopener"
											className="inline-flex items-center gap-1 text-xs font-normal text-foreground/80 underline underline-offset-4 hover:text-foreground"
										>
											<Crosshair className="size-3.5" /> Seek
										</a>
									</span>
								</div>
							)}
						</div>
						<div className="mt-1 min-w-0 text-sm">
							{isRenamingFile ? (
								<form className="flex w-full min-w-0 items-center gap-1" onSubmit={handleRenameSubmit}>
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
										className="h-7 min-w-0 flex-1 text-sm"
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
							) : cursorFileHref ? (
								<a
									href={cursorFileHref}
									target="_blank"
									rel="noopener"
									onPointerDown={filenameHoldAction.handlePointerDown}
									onPointerUp={filenameHoldAction.handlePointerEnd}
									onPointerLeave={filenameHoldAction.handlePointerEnd}
									onPointerCancel={filenameHoldAction.handlePointerEnd}
									onClick={handleFilenameClick}
									title="Click to open. Hold to rename."
									className="block w-full min-w-0 break-all text-foreground/80 underline underline-offset-4 hover:text-foreground"
								>
									{currentFilename}
								</a>
							) : (
								<button
									type="button"
									onPointerDown={filenameHoldAction.handlePointerDown}
									onPointerUp={filenameHoldAction.handlePointerEnd}
									onPointerLeave={filenameHoldAction.handlePointerEnd}
									onPointerCancel={filenameHoldAction.handlePointerEnd}
									disabled={isTaskFileMutationPending}
									title="Hold to rename file"
									className="block w-full min-w-0 break-all text-left text-foreground/80 hover:text-foreground hover:underline hover:underline-offset-4 disabled:cursor-default disabled:hover:no-underline"
								>
									{currentFilename}
								</button>
							)}
						</div>
					</div>

					<div className="flex shrink-0 flex-wrap justify-end gap-2">
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label={isInspectorExpanded ? 'Collapse detail panel' : 'Expand detail panel'}
							title={isInspectorExpanded ? 'Collapse detail panel' : 'Expand detail panel'}
							onClick={onInspectorExpandedToggle}
						>
							{isInspectorExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
						</Button>
						<Button
							type="button"
							size="icon-sm"
							variant="destructive"
							aria-label="Move to system Trash"
							onClick={() => trashTaskMutation.mutate()}
							disabled={isTaskFileMutationPending}
						>
							<Trash2 className="size-4" />
						</Button>
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

				<div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xs">
					<div className="min-w-28">
						<label className="text-muted-foreground" htmlFor={priorityInputId}>
							Priority
						</label>
						<select
							id={priorityInputId}
							value={task.priority ?? ''}
							onChange={(event) => handlePriorityChange(event.currentTarget.value)}
							disabled={updateTaskPriorityMutation.isPending}
							className="mt-0.5 h-7 w-full rounded-sm border border-input bg-background px-2 font-medium text-foreground disabled:opacity-50"
						>
							<option value="" disabled>
								none
							</option>
							{taskPriorityOptions.map((priorityOption) => (
								<option key={priorityOption} value={priorityOption}>
									{priorityOption}
								</option>
							))}
						</select>
					</div>
					<div className="min-w-32">
						<label className="text-muted-foreground" htmlFor={bucketInputId}>
							Bucket
						</label>
						<select
							id={bucketInputId}
							value={task.status}
							onChange={(event) => handleBucketChange(event.currentTarget.value)}
							disabled={moveTaskMutation.isPending}
							className="mt-0.5 h-7 w-full rounded-sm border border-input bg-background px-2 font-medium text-foreground disabled:opacity-50"
						>
							{[task.status].concat(moveStatusOptions).map((statusOption) => (
								<option key={statusOption} value={statusOption}>
									{formatTaskBucketLabel(statusOption)}
								</option>
							))}
						</select>
					</div>
					<div className="min-w-24">
						<div className="text-muted-foreground">Visibility</div>
						<div className="mt-0.5 truncate font-medium text-foreground">
							{formatSourceLabel(task.taskSource)}
						</div>
					</div>
					<TimestampButton label="Created" value={task.created} onCopy={handleTimestampCopy} />
					<TimestampButton label="Updated" value={task.updated} onCopy={handleTimestampCopy} />
				</div>

				<div className="mt-3 max-h-36 space-y-2 overflow-auto">
					{systemTagGroups.map((group) => (
						<div key={getTagGroupLookupKey(group.key)} className="flex min-w-0 items-start gap-2">
							<div className="flex h-6 w-28 shrink-0 items-center text-xs text-muted-foreground">
								{formatTagGroupLabel(group.key)}
							</div>
							<div className="flex min-w-0 flex-1 flex-wrap gap-1">
								{group.entries.map((entry) => {
									const isSelected = task.tags.includes(entry.tag);

									return (
										<button
											key={entry.tag}
											type="button"
											title={entry.tag}
											onClick={() => handleTagToggle(entry.tag)}
											disabled={updateTaskTagsMutation.isPending}
											className={`rounded border px-1.5 py-0.5 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50 ${
												isSelected
													? `${getTagClassName(entry.tag)} border-foreground/30`
													: 'border-border/80 bg-background text-foreground/70 hover:border-foreground/40 hover:text-foreground'
											}`}
										>
											#{entry.value}
										</button>
									);
								})}
							</div>
						</div>
					))}
					{systemTags.length === 0 ? (
						<div className="text-xs text-muted-foreground">No system tags yet.</div>
					) : null}
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
				{trashTaskMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{getMutationErrorMessage(trashTaskMutation.error, 'failed to move task to system Trash')}
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
				{updateTaskPriorityMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{getMutationErrorMessage(updateTaskPriorityMutation.error, 'failed to update task priority')}
					</div>
				) : null}
			</header>

			<div className="space-y-4 p-4">
				<div className="space-y-4">
					{detail.relations.parentKey && renderRelation('Parent', [detail.relations.parentKey])}
					{renderRelation('Children', detail.relations.children)}
				</div>

				<Mdx text={task.body} className="text-sm" assetBasePath={taskAssetBasePath} />

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

function TimestampButton({
	label,
	value,
	onCopy,
}: {
	label: string;
	value: string;
	onCopy: (value: string) => Promise<void>;
}) {
	//
	return (
		<button
			type="button"
			onClick={() => {
				void onCopy(value);
			}}
			className="min-w-36 text-left hover:text-foreground"
			title={`Copy ${value}`}
		>
			<div className="text-muted-foreground">{label}</div>
			<div className="mt-0.5 truncate font-medium text-foreground">{formatTaskTimestamp(value)}</div>
		</button>
	);
}

interface SystemTagGroup {
	key: string | null;
	entries: Array<{
		tag: string;
		value: string;
	}>;
}

function buildSystemTagGroups(tags: string[]): SystemTagGroup[] {
	//
	const groupsByKey = new Map<string, SystemTagGroup>();

	for (const tag of tags) {
		const parsedTag = parseTaskTag(tag);
		const lookupKey = getTagGroupLookupKey(parsedTag.key);
		const existingGroup = groupsByKey.get(lookupKey);
		const group = existingGroup ?? {
			key: parsedTag.key,
			entries: [],
		};

		if (!existingGroup) {
			groupsByKey.set(lookupKey, group);
		}

		if (group.entries.some((entry) => entry.tag === parsedTag.tag)) continue;

		group.entries.push({
			tag: parsedTag.tag,
			value: parsedTag.value,
		});
	}

	return Array.from(groupsByKey.values())
		.sort((left, right) => compareTagGroupKeys(left.key, right.key))
		.map((group) => ({
			key: group.key,
			entries: group.entries.sort(compareSystemTagEntries),
		}));
}

function compareSystemTagEntries(
	left: SystemTagGroup['entries'][number],
	right: SystemTagGroup['entries'][number],
): number {
	//
	if (left.value !== right.value) return left.value.localeCompare(right.value);

	return left.tag.localeCompare(right.tag);
}

function useHoldAction(action: () => void, isDisabled: boolean) {
	//
	const timeoutRef = useRef<number | null>(null);
	const didTriggerRef = useRef(false);

	const clearHoldTimer = () => {
		if (timeoutRef.current === null) return;
		window.clearTimeout(timeoutRef.current);
		timeoutRef.current = null;
	};

	const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
		if (isDisabled) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;

		clearHoldTimer();
		didTriggerRef.current = false;
		timeoutRef.current = window.setTimeout(() => {
			didTriggerRef.current = true;
			action();
		}, HOLD_ACTION_DELAY_MS);
	};

	const handlePointerEnd = () => {
		clearHoldTimer();
	};

	const shouldSuppressClick = () => {
		if (!didTriggerRef.current) return false;
		didTriggerRef.current = false;
		return true;
	};

	useEffect(() => {
		return () => {
			if (timeoutRef.current === null) return;
			window.clearTimeout(timeoutRef.current);
		};
	}, []);

	return {
		handlePointerDown,
		handlePointerEnd,
		shouldSuppressClick,
	};
}

function formatTaskTimestamp(value: string): string {
	//
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return value;

	return date.toLocaleString(undefined, {
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		month: 'short',
		year: 'numeric',
	});
}

function getTagClassName(tag: string): string {
	//
	const colorIndex = Array.from(tag).reduce((total, char) => total + char.charCodeAt(0), 0) % 6;

	if (colorIndex === 0) return 'bg-sky-400/15 text-sky-100';
	if (colorIndex === 1) return 'bg-emerald-400/15 text-emerald-100';
	if (colorIndex === 2) return 'bg-violet-400/15 text-violet-100';
	if (colorIndex === 3) return 'bg-amber-400/15 text-amber-100';
	if (colorIndex === 4) return 'bg-rose-400/15 text-rose-100';

	return 'bg-zinc-500/30 text-zinc-100';
}

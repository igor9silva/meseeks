import type { FormEvent, MouseEvent } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { TaskDetailTask } from '../taskExplorerTypes';
import {
	createTaskRenameFilename,
	dedupeStrings,
	getTaskDisplayFilename,
	parseTaskPriority,
	parseTaskSource,
	toCodexPlanHref,
	toCodexSeekHref,
	toCursorFileHref,
} from '../taskExplorerUtils';
import { buildSystemTagGroups } from './systemTagGroups';
import type { TaskDetailCallbacks, TaskDetailPanelControls } from './TaskDetailHeaderTypes';
import type { TaskDetailMetadataModel } from './TaskDetailMetadata';
import {
	getPrivateBlurClassName,
	getTaskPathFilename,
	isStructuralTask,
} from './taskDetailUtils';
import type { TaskMutationErrorEntry } from './TaskMutationErrors';
import { useHoldAction } from './useHoldAction';
import { useTaskDetailMutations } from './useTaskDetailMutations';

const COPY_FEEDBACK_MS = 1500;

interface TaskDetailHeaderModelInput {
	task: TaskDetailTask;
	shouldBlurPrivateTasks: boolean;
	tagOptions: string[];
	callbacks: TaskDetailCallbacks;
	panel: TaskDetailPanelControls;
}

export function useTaskDetailHeaderModel({
	task,
	shouldBlurPrivateTasks,
	tagOptions,
	callbacks,
	panel,
}: TaskDetailHeaderModelInput) {
	//
	const priorityInputId = useId();
	const sourceInputId = useId();
	const renameFilenameInputId = useId();
	const titleInputId = useId();
	const filePathCopyResetTimeoutRef = useRef<number | null>(null);
	const renameFilenameInputRef = useRef<HTMLInputElement>(null);
	const titleInputRef = useRef<HTMLInputElement>(null);
	const cursorFileHref = toCursorFileHref(task.absolutePath);
	const codexPlanHref = toCodexPlanHref(task);
	const codexSeekHref = toCodexSeekHref(task);
	const taskFileRelativePath =
		task.taskSource === 'private' ? `private/files/${task.relativePath}` : `files/${task.relativePath}`;
	const isStructural = isStructuralTask(task);
	const indexedIsTaskCompleted = task.tags.includes('status:completed');
	const indexedIsTaskClass = task.tags.includes('class:task');
	const [optimisticIsTaskCompleted, setOptimisticIsTaskCompleted] = useState<boolean | null>(null);
	const [optimisticIsTaskClass, setOptimisticIsTaskClass] = useState<boolean | null>(null);
	const selectedTags = useMemo(
		() => applyOptimisticTagState(task.tags, optimisticIsTaskCompleted, optimisticIsTaskClass),
		[optimisticIsTaskClass, optimisticIsTaskCompleted, task.tags],
	);
	const displayFilename = useMemo(() => getTaskDisplayFilename(task.relativePath), [task.relativePath]);
	const currentFilename = useMemo(() => getTaskPathFilename(task.taskPath), [task.taskPath]);
	const currentFileBasename = currentFilename;
	const [isFilePathCopied, setIsFilePathCopied] = useState(false);
	const [isRenamingFile, setIsRenamingFile] = useState(false);
	const [renameDraft, setRenameDraft] = useState('');
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [titleDraft, setTitleDraft] = useState('');
	const shouldBlurTask = shouldBlurPrivateTasks && task.taskSource === 'private';
	const privateBlurClassName = getPrivateBlurClassName(shouldBlurTask);

	useEffect(() => {
		if (isRenamingFile) renameFilenameInputRef.current?.focus();
	}, [isRenamingFile]);

	useEffect(() => {
		if (isEditingTitle) titleInputRef.current?.focus();
	}, [isEditingTitle]);

	useEffect(() => {
		return () => {
			if (filePathCopyResetTimeoutRef.current === null) return;
			window.clearTimeout(filePathCopyResetTimeoutRef.current);
		};
	}, []);

	const systemTags = useMemo(() => dedupeStrings(task.tags.concat(tagOptions)), [tagOptions, task.tags]);
	const systemTagGroups = useMemo(() => buildSystemTagGroups(systemTags), [systemTags]);
	const normalizedRenameFilename = useMemo(() => createTaskRenameFilename(renameDraft), [renameDraft]);
	const mutations = useTaskDetailMutations(task, {
		...callbacks,
		onRenameSuccess: () => {
			setIsRenamingFile(false);
			setRenameDraft('');
		},
		onTitleSuccess: () => {
			setIsEditingTitle(false);
			setTitleDraft('');
		},
	});

	useEffect(() => {
		setOptimisticIsTaskCompleted(null);
		setOptimisticIsTaskClass(null);
	}, [task.key]);

	useEffect(() => {
		if (optimisticIsTaskCompleted === null) return;
		if (indexedIsTaskCompleted !== optimisticIsTaskCompleted) return;
		setOptimisticIsTaskCompleted(null);
	}, [indexedIsTaskCompleted, optimisticIsTaskCompleted]);

	useEffect(() => {
		if (optimisticIsTaskClass === null) return;
		if (indexedIsTaskClass !== optimisticIsTaskClass) return;
		setOptimisticIsTaskClass(null);
	}, [indexedIsTaskClass, optimisticIsTaskClass]);

	useEffect(() => {
		if (!mutations.updateTaskTagsMutation.error) return;
		setOptimisticIsTaskCompleted(null);
		setOptimisticIsTaskClass(null);
	}, [mutations.updateTaskTagsMutation.error]);

	const handleTagToggle = (tag: string) => {
		const isRemovingTag = selectedTags.includes(tag);

		if (tag === 'status:completed') {
			setOptimisticIsTaskCompleted(!isRemovingTag);
		}
		if (tag === 'class:task') {
			setOptimisticIsTaskClass(!isRemovingTag);
		}

		mutations.updateTaskTagsMutation.mutate({
			action: isRemovingTag ? 'remove' : 'add',
			tag,
		});
	};

	const handlePriorityChange = (value: string) => {
		const parsedPriority = parseTaskPriority(value);

		if (parsedPriority === null) return;
		if (parsedPriority === task.priority) return;

		mutations.updateTaskPriorityMutation.mutate(parsedPriority);
	};

	const handleSourceChange = (value: string) => {
		const parsedSource = parseTaskSource(value);

		if (parsedSource === null) return;
		if (parsedSource === task.taskSource) return;

		mutations.updateTaskSourceMutation.mutate(parsedSource);
	};

	const handleTimestampCopy = async (value: string) => {
		if (!navigator.clipboard) return;
		await navigator.clipboard.writeText(value);
	};

	const handleFilePathCopy = async () => {
		if (!navigator.clipboard) return;

		try {
			await navigator.clipboard.writeText(taskFileRelativePath);
		} catch {
			return;
		}

		if (filePathCopyResetTimeoutRef.current !== null) {
			window.clearTimeout(filePathCopyResetTimeoutRef.current);
		}

		setIsFilePathCopied(true);
		filePathCopyResetTimeoutRef.current = window.setTimeout(() => {
			setIsFilePathCopied(false);
			filePathCopyResetTimeoutRef.current = null;
		}, COPY_FEEDBACK_MS);
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

		mutations.renameTaskMutation.mutate(normalizedRenameFilename);
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

		mutations.updateTaskTitleMutation.mutate(trimmedTitle);
	};
	const titleHoldAction = useHoldAction(handleTitleEditStart, mutations.isTaskFileMutationPending || isEditingTitle);
	const filenameHoldAction = useHoldAction(handleRenameStart, mutations.isTaskFileMutationPending || isRenamingFile);

	const handleFilenameClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (!filenameHoldAction.shouldSuppressClick()) return;
		event.preventDefault();
	};

	const isRenameSubmitDisabled =
		mutations.renameTaskMutation.isPending ||
		renameDraft.trim().length === 0 ||
		normalizedRenameFilename.length === 0 ||
		renameDraft.trim() === currentFileBasename ||
		normalizedRenameFilename === currentFileBasename;
	const isTitleSubmitDisabled =
		mutations.updateTaskTitleMutation.isPending ||
		titleDraft.trim().length === 0 ||
		titleDraft.trim().replace(/\s+/g, ' ') === task.title;

	const metadata: TaskDetailMetadataModel = {
		task,
		priorityInputId,
		sourceInputId,
		privateBlurClassName,
		shouldBlurTask,
		isStructural,
		isPriorityPending: mutations.updateTaskPriorityMutation.isPending,
		isSourcePending: mutations.updateTaskSourceMutation.isPending,
		onPriorityChange: handlePriorityChange,
		onSourceChange: handleSourceChange,
		onTimestampCopy: handleTimestampCopy,
	};
	const mutationErrors: TaskMutationErrorEntry[] = [
		{ error: mutations.renameTaskMutation.error, fallback: 'failed to rename task file' },
		{ error: mutations.trashTaskMutation.error, fallback: 'failed to move task to system Trash' },
		{ error: mutations.updateTaskTitleMutation.error, fallback: 'failed to update task title' },
		{ error: mutations.updateTaskTagsMutation.error, fallback: 'failed to update task tags' },
		{ error: mutations.updateTaskPriorityMutation.error, fallback: 'failed to update task priority' },
		{ error: mutations.updateTaskSourceMutation.error, fallback: 'failed to update task visibility' },
	];

	return {
		title: {
			title: task.title,
			titleInputId,
			titleInputRef,
			titleDraft,
			isEditingTitle,
			isTaskFileMutationPending: mutations.isTaskFileMutationPending,
			isTitleMutationPending: mutations.updateTaskTitleMutation.isPending,
			isTitleSubmitDisabled,
			privateBlurClassName,
			codexPlanHref,
			codexSeekHref,
			titleHoldAction,
			onTitleDraftChange: setTitleDraft,
			onTitleSubmit: handleTitleSubmit,
			onTitleEditCancel: handleTitleEditCancel,
		},
		filename: {
			displayFilename,
			taskFileRelativePath,
			renameFilenameInputId,
			renameFilenameInputRef,
			renameDraft,
			cursorFileHref,
			isRenamingFile,
			isFilePathCopied,
			isTaskFileMutationPending: mutations.isTaskFileMutationPending,
			isRenameMutationPending: mutations.renameTaskMutation.isPending,
			isRenameSubmitDisabled,
			privateBlurClassName,
			filenameHoldAction,
			onRenameDraftChange: setRenameDraft,
			onRenameSubmit: handleRenameSubmit,
			onRenameCancel: handleRenameCancel,
			onFilenameClick: handleFilenameClick,
			onFilePathCopy: () => {
				void handleFilePathCopy();
			},
		},
		actions: {
			panel,
			isStructural,
			isTaskFileMutationPending: mutations.isTaskFileMutationPending,
			onTrashTask: () => mutations.trashTaskMutation.mutate(),
		},
		metadata,
		tags: {
			groups: systemTagGroups,
			selectedTags,
			allTags: systemTags,
			privateBlurClassName,
			isPending: mutations.updateTaskTagsMutation.isPending,
			onTagToggle: handleTagToggle,
		},
		mutationErrors,
	};
}

function applyOptimisticTagState(
	tags: string[],
	optimisticIsTaskCompleted: boolean | null,
	optimisticIsTaskClass: boolean | null,
): string[] {
	//
	const withCompleted = applyOptimisticTag(tags, 'status:completed', optimisticIsTaskCompleted);
	return applyOptimisticTag(withCompleted, 'class:task', optimisticIsTaskClass);
}

function applyOptimisticTag(tags: string[], tag: string, isSelected: boolean | null): string[] {
	//
	if (isSelected === null) return tags;
	if (isSelected) {
		if (tags.includes(tag)) return tags;
		return tags.concat(tag);
	}

	return tags.filter((currentTag) => currentTag !== tag);
}

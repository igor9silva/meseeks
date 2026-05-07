import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';
import { type CreateTaskInput, createTask } from '~/server/taskExplorer';
import type { CreateTaskDefaults, TaskCreatedResult } from './taskExplorerTypes';
import {
	createTaskFilename,
	formatSourceLabel,
	getMutationErrorMessage,
	parseTagDraft,
	parseTaskPriority,
	parseTaskSource,
	taskPriorityOptions,
	taskSourceOptions,
} from './taskExplorerUtils';

export function CreateTaskView({
	defaults,
	statusOptions,
	onCancel,
	onTaskCreated,
}: {
	defaults: CreateTaskDefaults;
	statusOptions: string[];
	onCancel: () => void;
	onTaskCreated: (result: TaskCreatedResult) => void;
}) {
	//
	const titleInputId = useId();
	const sourceSelectId = useId();
	const statusInputId = useId();
	const statusOptionsListId = useId();
	const prioritySelectId = useId();
	const tagsInputId = useId();
	const bodyTextareaId = useId();
	const filenameInputId = useId();
	const titleInputRef = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const createTaskServer = useServerFn(createTask);
	const [title, setTitle] = useState('');
	const [taskSource, setTaskSource] = useState(defaults.taskSource);
	const [status, setStatus] = useState(defaults.status);
	const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
	const [priority, setPriority] = useState<CreateTaskInput['priority']>('medium');
	const [tagDraft, setTagDraft] = useState('');
	const [body, setBody] = useState('');
	const [filename, setFilename] = useState('');
	const [hasEditedFilename, setHasEditedFilename] = useState(false);
	const filteredStatusOptions = useMemo(() => {
		const normalizedStatus = status.trim().toLowerCase();
		if (normalizedStatus.length === 0) return statusOptions;

		return statusOptions.filter((statusOption) => statusOption.toLowerCase().includes(normalizedStatus));
	}, [status, statusOptions]);
	const normalizedFilename = useMemo(() => createTaskFilename(filename), [filename]);
	const createTaskMutation = useMutation({
		mutationFn: (input: CreateTaskInput) => createTaskServer({ data: input }),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			onTaskCreated({
				status: result.status,
				taskKey: result.newTaskKey,
				taskSource: result.taskSource,
			});
		},
	});

	useEffect(() => {
		setTaskSource(defaults.taskSource);
		setStatus(defaults.status);
		setIsStatusMenuOpen(false);
	}, [defaults.status, defaults.taskSource]);

	useEffect(() => {
		titleInputRef.current?.focus();
	}, []);

	useEffect(() => {
		if (hasEditedFilename) return;
		setFilename(createTaskFilename(title));
	}, [hasEditedFilename, title]);

	const handleSourceChange = (value: string) => {
		const parsedSource = parseTaskSource(value);
		if (parsedSource === null) return;
		setTaskSource(parsedSource);
	};

	const handlePriorityChange = (value: string) => {
		const parsedPriority = parseTaskPriority(value);
		if (parsedPriority === null) return;
		setPriority(parsedPriority);
	};

	const handleStatusBlur = () => {
		window.setTimeout(() => setIsStatusMenuOpen(false), 120);
	};

	const handleStatusOptionSelect = (statusOption: string) => {
		setStatus(statusOption);
		setIsStatusMenuOpen(false);
	};

	const handleFilenameChange = (value: string) => {
		setHasEditedFilename(true);
		setFilename(value);
	};

	const handleFilenameBlur = () => {
		setFilename(createTaskFilename(filename));
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedTitle = title.trim();
		if (trimmedTitle.length === 0) return;
		if (normalizedFilename.length === 0) return;

		createTaskMutation.mutate({
			body,
			filename: normalizedFilename,
			priority,
			status,
			tags: parseTagDraft(tagDraft),
			taskSource,
			title: trimmedTitle,
		});
	};

	return (
		<div className="h-full overflow-auto">
			<header className="border-b border-border p-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="text-xl font-semibold">New task</h2>
						<div className="mt-1 text-xs text-muted-foreground">
							{taskSource}:{status || 'backlog'}
						</div>
					</div>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={onCancel}
						disabled={createTaskMutation.isPending}
					>
						<X className="size-4" />
						Cancel
					</Button>
				</div>
			</header>

			<form className="space-y-4 p-4" onSubmit={handleSubmit}>
				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor={titleInputId}>
						Title
					</label>
					<Input
						ref={titleInputRef}
						id={titleInputId}
						value={title}
						onChange={(event) => setTitle(event.currentTarget.value)}
						disabled={createTaskMutation.isPending}
					/>
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor={sourceSelectId}>
							Source
						</label>
						<select
							id={sourceSelectId}
							value={taskSource}
							onChange={(event) => handleSourceChange(event.currentTarget.value)}
							disabled={createTaskMutation.isPending}
							className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
						>
							{taskSourceOptions.map((source) => (
								<option key={source} value={source}>
									{formatSourceLabel(source)}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor={statusInputId}>
							Status
						</label>
						<div className="relative">
							<Input
								id={statusInputId}
								value={status}
								onChange={(event) => {
									setStatus(event.currentTarget.value);
									setIsStatusMenuOpen(true);
								}}
								onFocus={() => setIsStatusMenuOpen(true)}
								onBlur={handleStatusBlur}
								disabled={createTaskMutation.isPending}
								autoComplete="off"
								// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- this is our input primitive; oxlint cannot see through the component wrapper
								role="combobox"
								aria-expanded={isStatusMenuOpen}
								aria-controls={statusOptionsListId}
								className="pr-9"
							/>
							<Button
								type="button"
								size="icon-xs"
								variant="ghost"
								aria-label="Show statuses"
								disabled={createTaskMutation.isPending}
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
								className="absolute right-1 top-1/2 -translate-y-1/2"
							>
								<ChevronDown className="size-3" />
							</Button>
							{isStatusMenuOpen ? (
								<div
									id={statusOptionsListId}
									// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- this is a custom filtered status menu, not a native select
									role="listbox"
									className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md"
								>
									{filteredStatusOptions.map((statusOption) => (
										<button
											key={statusOption}
											type="button"
											role="option"
											aria-selected={statusOption === status}
											onMouseDown={(event) => event.preventDefault()}
											onClick={() => handleStatusOptionSelect(statusOption)}
											className={cn(
												'block w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground',
												statusOption === status && 'bg-accent text-accent-foreground',
											)}
										>
											{statusOption}
										</button>
									))}
									{filteredStatusOptions.length === 0 ? (
										<div className="px-2 py-1.5 text-muted-foreground">Type a new status</div>
									) : null}
								</div>
							) : null}
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor={prioritySelectId}>
							Priority
						</label>
						<select
							id={prioritySelectId}
							value={priority}
							onChange={(event) => handlePriorityChange(event.currentTarget.value)}
							disabled={createTaskMutation.isPending}
							className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
						>
							{taskPriorityOptions.map((priorityOption) => (
								<option key={priorityOption} value={priorityOption}>
									{priorityOption}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor={tagsInputId}>
						Tags
					</label>
					<Input
						id={tagsInputId}
						value={tagDraft}
						onChange={(event) => setTagDraft(event.currentTarget.value)}
						placeholder="debt, ux"
						disabled={createTaskMutation.isPending}
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor={bodyTextareaId}>
						Body
					</label>
					<Textarea
						id={bodyTextareaId}
						value={body}
						onChange={(event) => setBody(event.currentTarget.value)}
						placeholder="Context, objective, subtasks, notes..."
						disabled={createTaskMutation.isPending}
						className="min-h-64 resize-y"
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor={filenameInputId}>
						Filename
					</label>
					<div className="flex items-center gap-2">
						<Input
							id={filenameInputId}
							value={filename}
							onChange={(event) => handleFilenameChange(event.currentTarget.value)}
							onBlur={handleFilenameBlur}
							placeholder="task-filename"
							disabled={createTaskMutation.isPending}
						/>
						<span className="text-sm text-muted-foreground">.mdx</span>
					</div>
				</div>

				{createTaskMutation.error ? (
					<div className="text-sm text-destructive">
						{getMutationErrorMessage(createTaskMutation.error, 'failed to create task')}
					</div>
				) : null}

				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={onCancel} disabled={createTaskMutation.isPending}>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={
							createTaskMutation.isPending || title.trim().length === 0 || normalizedFilename.length === 0
						}
					>
						<Plus className="size-4" />
						{createTaskMutation.isPending ? 'Creating...' : 'Create'}
					</Button>
				</div>
			</form>
		</div>
	);
}

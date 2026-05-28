import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Plus, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
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
	taskPriorityOptions,
	taskSourceOptions,
} from './taskExplorerUtils';

const createTaskStatusOptions: Array<NonNullable<CreateTaskInput['status']>> = ['backlog', 'active', 'completed'];

export function CreateTaskView({
	defaults,
	onCancel,
	onTaskCreated,
}: {
	defaults: CreateTaskDefaults;
	onCancel: () => void;
	onTaskCreated: (result: TaskCreatedResult) => void;
}) {
	//
	const titleInputId = useId();
	const tagsInputId = useId();
	const bodyTextareaId = useId();
	const filenameInputId = useId();
	const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
	const queryClient = useQueryClient();
	const createTaskServer = useServerFn(createTask);
	const [title, setTitle] = useState('');
	const [taskSource, setTaskSource] = useState(defaults.taskSource);
	const [parentPath, setParentPath] = useState(defaults.parentPath);
	const [status, setStatus] = useState<CreateTaskInput['status']>(defaults.status);
	const [priority, setPriority] = useState<CreateTaskInput['priority']>('medium');
	const [tagDraft, setTagDraft] = useState('');
	const [body, setBody] = useState('');
	const [filename, setFilename] = useState('');
	const [hasEditedFilename, setHasEditedFilename] = useState(false);
	const displayedFilename = hasEditedFilename ? filename : createTaskFilename(title || body);
	const normalizedFilename = createTaskFilename(displayedFilename || title || body);
	const createTaskMutation = useMutation({
		mutationFn: (input: CreateTaskInput) => createTaskServer({ data: input }),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			onTaskCreated({
				taskKey: result.newTaskKey,
				taskPath: result.taskPath,
				taskSource: result.taskSource,
			});
		},
	});

	useEffect(() => {
		bodyTextareaRef.current?.focus();
	}, []);

	const handleFilenameChange = (value: string) => {
		setHasEditedFilename(true);
		setFilename(value);
	};

	const handleFilenameBlur = () => {
		setFilename(createTaskFilename(filename));
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedBody = body.trim();
		const trimmedTitle = title.trim().replace(/\s+/g, ' ');

		if (trimmedBody.length === 0) return;

		const normalizedParentPath = parentPath.trim().replace(/^\/+|\/+$/g, '');
		const nextStatus =
			normalizedParentPath === 'tasks' || normalizedParentPath.startsWith('tasks/')
				? (status ?? 'backlog')
				: null;

		createTaskMutation.mutate({
			body: trimmedBody,
			filename: normalizedFilename,
			priority,
			parentPath: normalizedParentPath.length > 0 ? normalizedParentPath : 'inbox',
			status: nextStatus,
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
							{taskSource}/{parentPath || 'root'}
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
					<label className="text-sm font-medium" htmlFor={bodyTextareaId}>
						Body
					</label>
					<Textarea
						ref={bodyTextareaRef}
						id={bodyTextareaId}
						value={body}
						onChange={(event) => setBody(event.currentTarget.value)}
						placeholder="Capture the raw task here."
						disabled={createTaskMutation.isPending}
						className="min-h-72 resize-y"
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor={titleInputId}>
						Title
					</label>
					<Input
						id={titleInputId}
						value={title}
						onChange={(event) => setTitle(event.currentTarget.value)}
						placeholder="optional"
						disabled={createTaskMutation.isPending}
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor={filenameInputId}>
						Filename
					</label>
					<div className="flex items-center gap-2">
						<Input
							id={filenameInputId}
							value={displayedFilename}
							onChange={(event) => handleFilenameChange(event.currentTarget.value)}
							onBlur={handleFilenameBlur}
							placeholder={normalizedFilename || 'auto-generated'}
							disabled={createTaskMutation.isPending}
						/>
						<span className="text-sm text-muted-foreground">.mdx</span>
					</div>
				</div>

				<div className="space-y-2">
					<div className="text-sm font-medium">Visibility</div>
					<div className="inline-flex rounded-md border border-border p-1">
						{taskSourceOptions.map((source) => (
							<button
								key={source}
								type="button"
								onClick={() => setTaskSource(source)}
								disabled={createTaskMutation.isPending}
								className={cn(
									'h-8 rounded-sm px-3 text-sm transition-colors disabled:pointer-events-none disabled:opacity-50',
									source === taskSource
										? 'bg-foreground text-background'
										: 'text-muted-foreground hover:text-foreground',
								)}
							>
								{formatSourceLabel(source)}
							</button>
						))}
					</div>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor={`${filenameInputId}-parent`}>
						Parent path
					</label>
					<Input
						id={`${filenameInputId}-parent`}
						value={parentPath}
						onChange={(event) => setParentPath(event.currentTarget.value)}
						placeholder="inbox"
						disabled={createTaskMutation.isPending}
					/>
				</div>

				{parentPath === 'tasks' || parentPath.startsWith('tasks/') ? (
					<div className="space-y-2">
						<div className="text-sm font-medium">Status</div>
						<div className="flex max-h-36 flex-wrap gap-1 overflow-auto">
							{createTaskStatusOptions.map((statusOption) => (
								<button
									key={statusOption}
									type="button"
									onClick={() => setStatus(statusOption)}
									disabled={createTaskMutation.isPending}
									className={cn(
										'h-8 rounded-md border px-2 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50',
										statusOption === status
											? 'border-sky-400/70 bg-sky-400/15 text-sky-100'
											: 'border-border text-muted-foreground hover:text-foreground',
									)}
								>
									{statusOption}
								</button>
							))}
						</div>
					</div>
				) : null}

				<div className="space-y-2">
					<div className="text-sm font-medium">Priority</div>
					<div className="flex flex-wrap gap-1">
						{taskPriorityOptions.map((priorityOption) => (
							<button
								key={priorityOption}
								type="button"
								onClick={() => setPriority(priorityOption)}
								disabled={createTaskMutation.isPending}
								className={cn(
									'h-8 rounded-md border px-2 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50',
									priorityOption === priority
										? 'border-foreground bg-foreground text-background'
										: 'border-border text-muted-foreground hover:text-foreground',
								)}
							>
								{priorityOption}
							</button>
						))}
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

				{createTaskMutation.error ? (
					<div className="text-sm text-destructive">
						{getMutationErrorMessage(createTaskMutation.error, 'failed to create task')}
					</div>
				) : null}

				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={onCancel} disabled={createTaskMutation.isPending}>
						Cancel
					</Button>
					<Button type="submit" disabled={createTaskMutation.isPending || body.trim().length === 0}>
						<Plus className="size-4" />
						{createTaskMutation.isPending ? 'Creating...' : 'Create'}
					</Button>
				</div>
			</form>
		</div>
	);
}

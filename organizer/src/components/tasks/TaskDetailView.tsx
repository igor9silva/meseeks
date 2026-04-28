import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";
import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Mdx } from "~/components/ui/mdx";
import { markTaskDone, updateTaskTags } from "~/server/taskExplorer";
import type { TaskDetailResult, TaskDetailTask } from "./taskExplorerTypes";
import {
	getMutationErrorMessage,
	toCodexTaskHref,
	toCursorFileHref,
	toCursorTaskHref,
} from "./taskExplorerUtils";

export function TaskDetailView({
	detail,
	onNavigateTask,
	onTaskCompleted,
}: {
	detail: TaskDetailResult;
	onNavigateTask: (taskKey: string) => void;
	onTaskCompleted: (taskKey: string) => void;
}) {
	//
	if (!detail.task) return null;

	return (
		<TaskDetailContent
			key={detail.task.key}
			detail={detail}
			task={detail.task}
			onNavigateTask={onNavigateTask}
			onTaskCompleted={onTaskCompleted}
		/>
	);
}

function TaskDetailContent({
	detail,
	task,
	onNavigateTask,
	onTaskCompleted,
}: {
	detail: TaskDetailResult;
	task: TaskDetailTask;
	onNavigateTask: (taskKey: string) => void;
	onTaskCompleted: (taskKey: string) => void;
}) {
	//
	const tagInputId = useId();
	const queryClient = useQueryClient();
	const markTaskDoneServer = useServerFn(markTaskDone);
	const updateTaskTagsServer = useServerFn(updateTaskTags);
	const relatedTasks = detail.relatedTasks ?? [];
	const relatedTaskByKey = new Map(
		relatedTasks.map((relatedTask) => [relatedTask.key, relatedTask]),
	);
	const cursorFileHref = toCursorFileHref(task.absolutePath);
	const cursorTaskHref = toCursorTaskHref(task);
	const codexTaskHref = toCodexTaskHref(task);
	const canMarkDone = task.status !== "completed";
	const [tagDraft, setTagDraft] = useState("");
	const markTaskDoneMutation = useMutation({
		mutationFn: () => markTaskDoneServer({ data: { taskKey: task.key } }),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["tasks-explorer"] }),
				queryClient.invalidateQueries({ queryKey: ["task-detail"] }),
			]);

			onTaskCompleted(result.newTaskKey);
		},
	});
	const updateTaskTagsMutation = useMutation({
		mutationFn: ({ action, tag }: { action: "add" | "remove"; tag: string }) =>
			updateTaskTagsServer({ data: { taskKey: task.key, action, tag } }),
		onSuccess: async (_, variables) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["tasks-explorer"] }),
				queryClient.invalidateQueries({ queryKey: ["task-detail"] }),
			]);

			if (variables.action === "add") {
				setTagDraft("");
			}
		},
	});

	const handleTagSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (tagDraft.trim().length === 0) return;

		updateTaskTagsMutation.mutate({
			action: "add",
			tag: tagDraft,
		});
	};

	const handleTagRemove = (tag: string) => {
		updateTaskTagsMutation.mutate({
			action: "remove",
			tag,
		});
	};

	const renderRelation = (label: string, keys: string[]) => {
		if (keys.length === 0) return null;

		return (
			<div className="space-y-1">
				<div className="text-xs uppercase tracking-wide text-muted-foreground">
					{label}
				</div>
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
								<div className="break-all text-xs text-muted-foreground">
									{key}
								</div>
							</button>
						);
					})}
				</div>
			</div>
		);
	};

	return (
		<div className="h-full overflow-auto">
			<header className="flex flex-col gap-0 border-b border-border p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
							<h2 className="text-xl font-semibold">{task.title}</h2>
							<span className="break-all text-sm text-muted-foreground">
								{task.id}
							</span>
						</div>
					</div>

					{canMarkDone ? (
						<Button
							type="button"
							size="sm"
							variant="secondary"
							onClick={() => markTaskDoneMutation.mutate()}
							disabled={markTaskDoneMutation.isPending}
						>
							<Check className="size-4" />
							{markTaskDoneMutation.isPending ? "Marking done..." : "Mark done"}
						</Button>
					) : null}
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
					<div className="text-xs uppercase tracking-wide text-muted-foreground">
						Tags
					</div>
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
						{task.tags.length === 0 && (
							<div className="text-xs text-muted-foreground">No tags yet.</div>
						)}
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
							disabled={
								updateTaskTagsMutation.isPending || tagDraft.trim().length === 0
							}
						>
							{updateTaskTagsMutation.isPending ? "Saving..." : "Add tag"}
						</Button>
					</form>
				</div>

				<div className="mt-2 flex flex-wrap gap-2 text-xs">
					<span className="rounded-md border border-border px-2 py-1">
						{task.taskSource}
					</span>
					<span className="rounded-md border border-border px-2 py-1">
						{task.status}
					</span>
					{task.priority && (
						<span className="rounded-md border border-border px-2 py-1">
							{task.priority}
						</span>
					)}
				</div>

				{markTaskDoneMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{getMutationErrorMessage(
							markTaskDoneMutation.error,
							"failed to mark task as done",
						)}
					</div>
				) : null}
				{updateTaskTagsMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{getMutationErrorMessage(
							updateTaskTagsMutation.error,
							"failed to update task tags",
						)}
					</div>
				) : null}
			</header>

			<div className="space-y-4 p-4">
				<div className="grid gap-4 md:grid-cols-2">
					{detail.relations.parentKey &&
						renderRelation("Parent", [detail.relations.parentKey])}
					{renderRelation("Children", detail.relations.children)}
				</div>

				<Mdx text={task.body} className="text-sm" />

				{task.warnings.length > 0 && (
					<details className="rounded-md border border-border/60 bg-muted/20 p-2 text-xs text-muted-foreground">
						<summary className="cursor-pointer font-medium">
							Warnings ({task.warnings.length})
						</summary>
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

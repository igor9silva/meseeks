import type { CreateTaskInput as ParsedCreateTaskInput } from '~/server/taskExplorerSchemas';
import type { TaskSummary } from '~/server/taskIndexSchemas';

export interface MarkTaskDoneResult {
	newTaskKey: string;
	status: string;
}

export interface MoveTaskInput {
	status: 'backlog' | 'active' | 'completed';
}

export interface MoveTaskResult {
	newTaskKey: string;
	status: string;
}

export interface UpdateTaskSourceInput {
	taskSource: TaskSummary['taskSource'];
}

export interface UpdateTaskSourceResult {
	newTaskKey: string;
	taskSource: TaskSummary['taskSource'];
}

export interface RenameTaskInput {
	filename: string;
}

export interface RenameTaskResult {
	newTaskKey: string;
	newTaskPath: string;
}

export interface TrashTaskResult {
	trashedPath: string;
}

type TaskPriority = ParsedCreateTaskInput['priority'];
type TagMutationAction = 'add' | 'remove';

export interface CreateTaskInput {
	body: string;
	filename: string;
	priority: TaskPriority;
	status: ParsedCreateTaskInput['status'];
	tags: string[];
	taskSource: TaskSummary['taskSource'];
	parentPath: string;
	title: string;
}

export interface CreateTaskResult {
	absolutePath: string;
	newRelativePath: string;
	newTaskKey: string;
	taskPath: string;
	taskSource: TaskSummary['taskSource'];
}

export interface UpdateTaskTagsInput {
	action: TagMutationAction;
	tag: string;
}

export interface UpdateTaskTagsResult {
	tags: string[];
}

export interface UpdateTaskPriorityInput {
	priority: TaskPriority | null;
}

export interface UpdateTaskPriorityResult {
	priority: TaskPriority | null;
}

export interface UpdateTaskTitleInput {
	title: string;
}

export interface UpdateTaskTitleResult {
	title: string;
}

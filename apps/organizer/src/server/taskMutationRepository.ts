export { createTask, renameTask, trashTask, updateTaskSource } from '~/server/taskMutationFiles';
export {
	markTaskDone,
	moveTask,
	updateTaskPriority,
	updateTaskTags,
	updateTaskTitle,
} from '~/server/taskMutationStatus';
export type {
	CreateTaskInput,
	CreateTaskResult,
	MarkTaskDoneResult,
	MoveTaskInput,
	MoveTaskResult,
	RenameTaskInput,
	RenameTaskResult,
	TrashTaskResult,
	UpdateTaskPriorityInput,
	UpdateTaskPriorityResult,
	UpdateTaskSourceInput,
	UpdateTaskSourceResult,
	UpdateTaskTagsInput,
	UpdateTaskTagsResult,
	UpdateTaskTitleInput,
	UpdateTaskTitleResult,
} from '~/server/taskMutationTypes';

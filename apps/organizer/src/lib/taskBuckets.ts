import { z } from 'zod';

export const taskBucketSchema = z.enum(['inbox', 'backlog', 'active', 'ideas', 'references', 'completed']);
export const taskBuckets = taskBucketSchema.options;
export type TaskBucket = z.infer<typeof taskBucketSchema>;
export const defaultFilteredTaskBuckets: TaskBucket[] = ['inbox', 'backlog', 'active'];
export const defaultVisibleTaskBuckets: TaskBucket[] = ['inbox', 'backlog', 'active'];

export function getDefaultTaskBuckets(): string[] {
	//
	return Array.from(defaultFilteredTaskBuckets);
}

export function isTaskBucket(value: string): value is TaskBucket {
	//
	return taskBucketSchema.safeParse(value).success;
}

export function formatTaskBucketLabel(status: string): string {
	//
	if (status === 'inbox') return 'Inbox';
	if (status === 'ideas') return 'Ideas';
	if (status === 'active') return 'Active';
	if (status === 'backlog') return 'Backlog';
	if (status === 'references') return 'References';
	if (status === 'completed') return 'Completed';

	return status;
}

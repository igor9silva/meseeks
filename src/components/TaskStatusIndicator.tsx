import { Doc } from 'convex/_generated/dataModel';
import { taskStatusSchema } from 'schemas/taskSchema';
import { z } from 'zod/v3';
import { StatusIndicator } from '~/components/StatusIndicator';
import { cn } from '~/lib/utils';

const classMap: Record<z.infer<typeof taskStatusSchema>, string> = {
	idle: 'hidden',
	unread: 'bg-blue-500',
	acting: 'hidden',
	blocked: 'bg-orange-700',
	done: 'hidden',
	discarded: 'hidden',
};

export const TaskStatusIndicator = ({
	task, //
	className,
}: {
	task: Doc<'tasks'>;
	className?: string;
}) => {
	//
	return <StatusIndicator className={cn(classMap[task.status], className)} />;
};

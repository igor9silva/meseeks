import { Doc } from 'convex/_generated/dataModel';
import { ArrowUp, Mic } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { useHandleSubmit } from '~/hooks/useHandleSubmit';
import { useSubmitHotkey } from '~/hooks/useSubmitHotkey';
import { useTaskMutations } from '~/hooks/useTaskMutations';
import { cn } from '~/lib/utils';

export function MessageComposer({
	className, //
	task,
}: {
	className?: string;
	task: Doc<'tasks'>;
}) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const { say } = useTaskMutations();

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	const handleSubmit = useHandleSubmit({
		schema: z.object({
			message: z.string().min(1, 'Message is required'),
		}),
		handler: async ({ message }) => {
			await say({ message, taskId: task._id });
		},
	});

	const handleKeyDown = useSubmitHotkey();

	return (
		<div className={cn('p-4 max-h-fit', className)}>
			<form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-row gap-2 items-end">
				<Textarea ref={textareaRef} name="message" required />
				<div className="flex flex-row gap-1">
					<Button
						type="button"
						size="action"
						variant="secondary"
						onClick={() => toast.warning('Voice is coming soon 🔥')}
					>
						<Mic />
					</Button>
					<Button type="submit" size="action">
						<ArrowUp />
					</Button>
				</div>
			</form>
		</div>
	);
}

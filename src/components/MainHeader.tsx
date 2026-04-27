import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft, Inbox, Loader2, SquarePen } from 'lucide-react';
import { useTransition } from 'react';
import { cn } from '~/lib/utils';

import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Balance } from '~/components/Balance';
import { useLauncher } from '~/components/Launcher';
import { TaskStatusIndicator } from '~/components/TaskStatusIndicator';
import { Button } from '~/components/ui/button';
import { TooltipButton, TooltipProvider } from '~/components/ui/tooltip';
import { useTask } from '~/hooks/query/useTask';
import { useSplatParams } from '~/hooks/useSplatParams';

export function MainHeader({ className }: { className?: string }) {
	//
	const { history } = useRouter();
	const { pathname, searchStr, search } = useLocation();
	const { open: openLauncher } = useLauncher();
	const { taskId } = useSplatParams();
	const currentTask = useQuery(api.tasks.findOne, taskId ? { taskId } : 'skip');
	const navigate = useNavigate();
	const [isNavigating, startTransition] = useTransition();
	const currentTaskTitle = currentTask?.title;
	const launcherTriggerLabel = currentTaskTitle || pathname + searchStr;

	const goBack = () => history.back();
	const goUp = () => {
		startTransition(() => {
			navigate({ to: '/$', params: { _splat: `` } });
		});
	};
	const goToNewTask = () => {
		startTransition(() => {
			navigate({ to: '/$', params: { _splat: 'new' } });
		});
	};

	return (
		<TooltipProvider>
			<header
				className={cn('flex h-14 items-center justify-between border-t md:border-b px-0 px-2 gap-1', className)}
			>
				<div className="flex items-center gap-1">
					{/* TODO: dynamically enable/disable
					https://github.com/TanStack/router/discussions/181#discussioncomment-11726923 */}
					<TooltipButton
						className="p-2 [&_svg]:size-5"
						variant="ghost"
						size="lg"
						onClick={goBack}
						tooltipContent="Go back"
					>
						<ArrowLeft />
					</TooltipButton>
					<TooltipButton
						className="p-2 [&_svg]:size-5"
						variant="ghost"
						size="lg"
						onClick={goUp}
						tooltipContent="Inbox"
						disabled={isNavigating}
					>
						{isNavigating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Inbox />}
					</TooltipButton>
				</div>

				<div className="w-1/2 flex gap-1">
					<Button
						variant="outline"
						onClick={openLauncher}
						className={cn(
							'w-full bg-muted/40 p-2 text-muted-foreground hover:bg-accent',
							currentTaskTitle
								? 'relative flex items-center justify-center'
								: 'flex justify-between gap-2 truncate',
						)}
					>
						<span
							className={cn(
								'text-xs md:text-sm',
								currentTaskTitle ? 'max-w-full truncate text-center' : 'truncate',
							)}
						>
							{launcherTriggerLabel}
						</span>
						<kbd
							className={cn(
								'h-5 items-center gap-0.5 rounded border bg-muted px-1 pt-0.5 font-mono text-xs font-medium text-muted-foreground md:inline-flex',
								currentTaskTitle ? 'absolute right-2 hidden' : 'hidden',
							)}
						>
							<span className="text-base">⌘</span>K
						</kbd>
					</Button>
					{/* <TooltipButton className="p-2" variant="ghost" onClick={share} tooltipContent="Share this task">
						<Share />
					</TooltipButton> */}
					{/* {search.selectedSubtaskId && (
						<TooltipButton
							variant="ghost"
							size="icon"
							className="[&_svg]:size-5"
							onClick={(e) => {
								e.preventDefault();
								navigate({ to: '/$', params: { _splat: `task/${search.selectedSubtaskId}` } });
							}}
							tooltipContent="Chat with selected task"
						>
							<ArrowRight />
						</TooltipButton>
					)} */}
				</div>

				<div className="flex gap-1">
					<Balance />
					<TooltipButton
						className="p-2 [&_svg]:size-5"
						variant="ghost"
						size="lg"
						onClick={goToNewTask}
						tooltipContent="New task"
						disabled={isNavigating}
					>
						{isNavigating ? <Loader2 className="h-5 w-5 animate-spin" /> : <SquarePen />}
					</TooltipButton>
					{/* {taskId && (
						<Suspense fallback={null}>
							<div className="flex items-center p-1">
								<TaskStatusIndicatorProvider taskId={taskId} />
							</div>
						</Suspense>
					)} */}
				</div>
			</header>
		</TooltipProvider>
	);
}

function TaskStatusIndicatorProvider({
	taskId, //
}: {
	taskId: Id<'tasks'>;
}) {
	//
	const { task } = useTask(taskId);

	return <TaskStatusIndicator className="" task={task} />;
}

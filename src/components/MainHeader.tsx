import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Inbox, Loader2, SquarePen } from 'lucide-react';
import { useTransition } from 'react';
import { cn } from '~/lib/utils';

import { Id } from 'convex/_generated/dataModel';
import { Balance } from '~/components/Balance';
import { useCommandMenu } from '~/components/CommandMenu';
import { TaskStatusIndicator } from '~/components/TaskStatusIndicator';
import { Button } from '~/components/ui/button';
import { TooltipButton, TooltipProvider } from '~/components/ui/tooltip';
import { useTask } from '~/hooks/query/useTask';
import { useSplatParams } from '~/hooks/useSplatParams';

export function MainHeader({ className }: { className?: string }) {
	//
	const { history } = useRouter();
	const { pathname, searchStr, search } = useLocation();
	const { open: openCommandDialog } = useCommandMenu();
	const { taskId } = useSplatParams();
	const navigate = useNavigate();
	const [isNavigating, startTransition] = useTransition();

	const goBack = () => history.back();
	const goUp = () => {
		startTransition(() => {
			navigate({ to: '/$', params: { _splat: `` } });
		});
	};
	const goToNewTask = () => {
		startTransition(() => {
			navigate({ to: '/$', params: { _splat: '/new' } });
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
						onClick={openCommandDialog}
						className="flex w-full justify-between gap-2 bg-muted/40 hover:bg-accent text-muted-foreground truncate p-2"
					>
						<span className="text-xs md:text-sm">
							{pathname}
							{searchStr}
						</span>
						<kbd className="hidden md:inline-flex h-5 items-center gap-0.5 pt-0.5 rounded border bg-muted px-1 font-mono font-medium text-muted-foreground text-xs">
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
								navigate({ to: '/$', params: { _splat: `/task/${search.selectedSubtaskId}` } });
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

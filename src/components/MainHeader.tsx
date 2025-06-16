import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Inbox, Share, SquarePen } from 'lucide-react';
import { Suspense } from 'react';
import { cn } from '~/lib/utils';

import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { toast } from 'sonner';
import { Balance } from '~/components/Balance';
import { useCommandMenu } from '~/components/CommandMenu';
import { TaskStatusIndicator } from '~/components/TaskStatusIndicator';
import { Button } from '~/components/ui/button';
import { TooltipProvider } from '~/components/ui/tooltip';
import { TooltipButton } from '~/components/ui/TooltipButton';
import { useSplatParams } from '~/hooks/useSplatParams';

export function MainHeader({ className }: { className?: string }) {
	//
	const { history } = useRouter();
	const { pathname, searchStr, search } = useLocation();
	const { open: openCommandDialog } = useCommandMenu();
	const { taskId } = useSplatParams();
	const navigate = useNavigate();

	const goBack = () => history.back();
	const goUp = () => navigate({ to: '/$', params: { _splat: `` } });
	const share = () => {
		navigator.clipboard.writeText(window.location.href);
		toast.success('Link copied to clipboard.');
	};

	return (
		<TooltipProvider>
			<header
				className={cn(
					'flex h-14 items-center justify-between border-t md:border-b px-0 md:px-2 gap-1',
					className,
				)}
			>
				<div className="flex items-center gap-1">
					{/* TODO: dynamically enable/disable
					https://github.com/TanStack/router/discussions/181#discussioncomment-11726923 */}
					<TooltipButton className="p-2" variant="ghost" onClick={goBack} tooltipContent="Go back">
						<ArrowLeft />
					</TooltipButton>
					<TooltipButton className="p-2" variant="ghost" onClick={goUp} tooltipContent="Inbox">
						<Inbox />
					</TooltipButton>
				</div>

				<div className="w-1/2 flex gap-1">
					<TooltipButton
						className="p-2"
						variant="ghost"
						onClick={() => navigate({ to: '/$', params: { _splat: '/new' } })}
						tooltipContent="New task"
					>
						<SquarePen />
					</TooltipButton>
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
					<TooltipButton className="p-2" variant="ghost" onClick={share} tooltipContent="Share this task">
						<Share />
					</TooltipButton>
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
					{taskId && (
						<Suspense fallback={null}>
							<div className="flex items-center p-1">
								<TaskStatusIndicatorProvider taskId={taskId} />
							</div>
						</Suspense>
					)}
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
	const query = convexQuery(api.tasks.public.findOne, { taskId });
	const { data: task } = useSuspenseQuery(query);

	return <TaskStatusIndicator className="" task={task} />;
}

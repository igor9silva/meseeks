import { useLocation, useRouter } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, ArrowUp, Share } from 'lucide-react';
import { Suspense } from 'react';
import { cn } from '~/lib/utils';

import { toast } from 'sonner';
import { ActionIsland } from '~/components/ActionIsland';
import { useCommandMenu } from '~/components/CommandMenu';
import { Button } from '~/components/ui/button';
import { useSplatParams } from '~/hooks/useSplatParams';

export function MainHeader({ className }: { className?: string }) {
	//
	const { history } = useRouter();
	const { pathname, searchStr } = useLocation();
	const { open: openCommandDialog } = useCommandMenu();
	const { taskId } = useSplatParams();

	const goBack = () => history.back();
	const goForward = () => history.forward();
	const goUp = () => {
		toast.error('Not implemented. Should go to parent task, if any.'); // TODO: implement
	};
	const share = () => {
		toast.error('Not implemented. Should share the current page.'); // TODO: implement
	};

	return (
		<header className={cn('flex h-14 items-center justify-between border-b px-2 gap-1', className)}>
			<div className="flex items-center gap-1">
				<Button className="p-2" variant="ghost" onClick={goBack}>
					<ArrowLeft />
				</Button>
				<Button className="p-2" variant="ghost" onClick={goForward}>
					{/* TODO: dynamically enable/disable
					https://github.com/TanStack/router/discussions/181#discussioncomment-11726923 */}
					<ArrowRight />
				</Button>
				<Button className="p-2" variant="ghost" onClick={goUp}>
					<ArrowUp />
				</Button>
			</div>

			<Button
				variant="outline"
				onClick={openCommandDialog}
				className="flex w-1/3 justify-between gap-2 bg-muted/40 hover:bg-accent text-muted-foreground truncate p-2"
			>
				<span className="text-xs md:text-sm">
					{pathname}
					{searchStr}
				</span>
				<kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1 font-mono font-medium text-muted-foreground text-xs">
					<span className="text-base">⌘</span>K
				</kbd>
			</Button>

			<div className="flex gap-1">
				<Button className="p-2" variant="ghost" onClick={share}>
					<Share />
				</Button>
				{taskId && (
					<Suspense fallback={null}>
						<ActionIsland taskId={taskId} />
					</Suspense>
				)}
			</div>
		</header>
	);
}

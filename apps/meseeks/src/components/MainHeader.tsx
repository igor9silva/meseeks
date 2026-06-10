import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft, Inbox, Loader2, Search, SquarePen } from 'lucide-react';
import { useTransition } from 'react';
import { cn } from '@reactor/ui/lib/utils';

import { api } from 'convex/_generated/api';
import { Balance } from '~/components/Balance';
import { useLauncher } from '~/components/Launcher';
import { Button } from '@reactor/ui/button';
import { TooltipButton, TooltipProvider } from '@reactor/ui/tooltip';
import { useCurrentFileId } from '~/hooks/useCurrentFile';

export function MainHeader({ className }: { className?: string }) {
	//
	const { history } = useRouter();
	const { pathname, searchStr } = useLocation();
	const { open: openLauncher } = useLauncher();
	const fileId = useCurrentFileId();
	const currentFile = useQuery(api.files.findOne, fileId ? { fileId } : 'skip');
	const navigate = useNavigate();
	const [isNavigating, startTransition] = useTransition();

	const fileName = currentFile?.name;
	const fallbackTitle = pathname + searchStr || 'Untitled file';

	const goBack = () => history.back();

	const goUp = () => {
		startTransition(() => {
			navigate({ to: '/$', params: { _splat: `inbox` } });
		});
	};
	const goToNewFile = () => {
		startTransition(() => {
			navigate({ to: '/$', params: { _splat: 'new' } });
		});
	};

	return (
		<TooltipProvider>
			<header className={cn('flex h-14 items-center justify-between gap-1 border-t px-2 md:border-b', className)}>
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
					<LauncherTrigger fallbackTitle={fallbackTitle} fileName={fileName} onClick={openLauncher} />
				</div>

				<div className="flex gap-1">
					<Balance />
					<TooltipButton
						className="p-2 [&_svg]:size-5"
						variant="ghost"
						size="lg"
						onClick={goToNewFile}
						tooltipContent="New file"
						disabled={isNavigating}
					>
						{isNavigating ? <Loader2 className="h-5 w-5 animate-spin" /> : <SquarePen />}
					</TooltipButton>
					{/* {fileId && (
						<Suspense fallback={null}>
							<div className="flex items-center p-1">
								<FileStatusIndicatorProvider fileId={fileId} />
							</div>
						</Suspense>
					)} */}
				</div>
			</header>
		</TooltipProvider>
	);
}

function LauncherTrigger({
	fallbackTitle, //
	fileName,
	onClick,
}: {
	fallbackTitle: string;
	fileName?: string;
	onClick: () => void;
}) {
	//
	return (
		<Button
			variant="outline"
			type="button"
			onClick={onClick}
			className="w-full relative flex items-center justify-start gap-2 truncate bg-muted/40 py-2 pr-3 pl-9 text-muted-foreground hover:bg-accent"
		>
			<Search className="absolute left-3 size-4 shrink-0" aria-hidden="true" />
			<HeaderTitle fallbackTitle={fallbackTitle} fileName={fileName} />
			<kbd
				className={cn(
					'hidden md:inline-flex absolute right-2 h-5 items-center gap-0.5 rounded-md border border-border/70 bg-background/80 px-1.5 font-mono text-xs font-medium leading-none text-muted-foreground/80 shadow-sm',
				)}
			>
				<span className="text-sm leading-none">⌘</span>K
			</kbd>
		</Button>
	);
}

function HeaderTitle({
	fileName, //
	fallbackTitle,
}: {
	fileName?: string;
	fallbackTitle: string;
}) {
	//
	if (!fileName) return <span className="truncate text-xs md:text-sm">{fallbackTitle}</span>;

	return (
		<span className="inline-flex min-w-0 flex-1 justify-center gap-1 text-xs md:pr-12 md:text-sm">
			<span className="shrink-0 text-muted-foreground/60">File:</span>
			<span className="truncate">{fileName}</span>
		</span>
	);
}

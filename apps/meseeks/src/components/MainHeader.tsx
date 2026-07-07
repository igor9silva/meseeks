import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Home, Search, Wallet } from 'lucide-react';
import { useTransition } from 'react';
import { cn } from '@reactor/ui/lib/utils';

import { useLauncher } from '~/components/Launcher';
import { Button } from '@reactor/ui/button';
import { TooltipButton, TooltipProvider } from '@reactor/ui/tooltip';

export function MainHeader({ className }: { className?: string }) {
	//
	const { history } = useRouter();
	const { pathname, searchStr } = useLocation();
	const { open: openLauncher } = useLauncher();
	const navigate = useNavigate();
	const [isNavigating, startTransition] = useTransition();

	const title = pathname + searchStr || '/';

	const goBack = () => history.back();

	const goHome = () => {
		startTransition(() => {
			navigate({ to: '/$', params: { _splat: '' } });
		});
	};

	const goToWallet = () => {
		startTransition(() => {
			navigate({ to: '/wallet' });
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
						onClick={goHome}
						tooltipContent="Home"
						disabled={isNavigating}
					>
						<Home />
					</TooltipButton>
				</div>

				<div className="w-1/2 flex gap-1">
					<LauncherTrigger title={title} onClick={openLauncher} />
				</div>

				<div className="flex gap-1">
					<TooltipButton
						className="p-2 [&_svg]:size-5"
						variant="ghost"
						size="lg"
						onClick={goToWallet}
						tooltipContent="Wallet"
						disabled={isNavigating}
					>
						<Wallet />
					</TooltipButton>
				</div>
			</header>
		</TooltipProvider>
	);
}

function LauncherTrigger({ title, onClick }: { title: string; onClick: () => void }) {
	//
	return (
		<Button
			variant="outline"
			onClick={onClick}
			className="w-full relative flex items-center justify-start gap-2 truncate bg-muted/40 py-2 pr-3 pl-9 text-muted-foreground hover:bg-accent"
		>
			<Search className="absolute left-3 size-4 shrink-0" aria-hidden="true" />
			<span className="truncate text-xs md:text-sm">{title}</span>
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

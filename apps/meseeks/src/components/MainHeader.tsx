import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Search } from 'lucide-react';
import { cn } from '@reactor/ui/lib/utils';

import { Balance } from '~/components/Balance';
import { useLauncher } from '~/components/Launcher';
import { Button } from '@reactor/ui/button';
import { TooltipButton, TooltipProvider } from '@reactor/ui/tooltip';

export function MainHeader({ className }: { className?: string }) {
	//
	const { history } = useRouter();
	const { pathname, searchStr } = useLocation();
	const { open: openLauncher } = useLauncher();

	const currentMode = new URLSearchParams(searchStr).get('mode') === 'dev' ? 'dev' : 'reg';
	const fallbackTitle = currentMode === 'reg' && isVfsPath(pathname) ? '' : pathname + searchStr || '/';

	const goBack = () => history.back();

	return (
		<TooltipProvider>
			<header
				className={cn(
					'relative z-20 flex h-14 items-center justify-between gap-1 overflow-hidden border-t border-white/20 bg-background/70 px-2 shadow-sm ring-1 ring-white/15 backdrop-blur-xl backdrop-saturate-150 md:border-b supports-[backdrop-filter]:bg-background/55 dark:border-white/10 dark:bg-background/45 dark:ring-white/10 dark:supports-[backdrop-filter]:bg-background/30',
					'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/60 before:content-[""] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-black/10 after:content-[""] dark:before:bg-white/20 dark:after:bg-white/10',
					className,
				)}
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
					<div className="px-2 text-sm font-semibold tracking-normal">PRO</div>
				</div>

				<div className="w-1/2 flex gap-1">
					<LauncherTrigger fallbackTitle={fallbackTitle} onClick={openLauncher} />
				</div>

				<div className="flex gap-1">
					<ModeToggle mode={currentMode} pathname={pathname} />
					<Balance />
				</div>
			</header>
		</TooltipProvider>
	);
}

function ModeToggle({ mode, pathname }: { mode: 'reg' | 'dev'; pathname: string }) {
	//
	const navigate = useNavigate();
	const nextMode = mode === 'dev' ? 'Reg' : 'Dev';
	const nextSearch = buildModeSearch(mode);
	const isEnabled = isVfsPath(pathname);

	const handleToggle = () => {
		if (!isEnabled) return;
		if (pathname === '/') {
			void navigate({ to: '/', search: nextSearch });
			return;
		}

		void navigate({
			to: '/$',
			params: { _splat: pathname.slice(1) },
			search: nextSearch,
		});
	};

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			aria-label={`Switch to ${nextMode} mode`}
			aria-pressed={mode === 'dev'}
			title={`Switch to ${nextMode} mode`}
			disabled={!isEnabled}
			className="h-8 rounded-full border-white/25 bg-background/45 px-1 text-xs shadow-sm backdrop-blur-xl backdrop-saturate-150 hover:bg-background/65 dark:border-white/10 dark:bg-background/30 dark:hover:bg-background/45"
			onClick={handleToggle}
		>
			<span
				className={cn(
					'rounded-full px-2 py-0.5 text-muted-foreground transition-colors',
					mode === 'reg' && 'bg-foreground text-background',
				)}
			>
				Reg
			</span>
			<span
				className={cn(
					'rounded-full px-2 py-0.5 text-muted-foreground transition-colors',
					mode === 'dev' && 'bg-foreground text-background',
				)}
			>
				Dev
			</span>
		</Button>
	);
}

function buildModeSearch(mode: 'reg' | 'dev'): { mode?: 'dev' } {
	//
	if (mode === 'dev') return { mode: undefined };
	return { mode: 'dev' };
}

function isVfsPath(pathname: string) {
	//
	const nonVfsPrefixes = ['/api', '/files', '/polar', '/skills', '/top-up', '/wallet'];
	if (pathname === '/') return true;
	return !nonVfsPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function LauncherTrigger({
	fallbackTitle, //
	onClick,
}: {
	fallbackTitle: string;
	onClick: () => void;
}) {
	//
	return (
		<Button
			variant="outline"
			onClick={onClick}
			className="relative w-full flex items-center justify-start gap-2 truncate border-white/25 bg-background/45 py-2 pr-3 pl-9 text-muted-foreground shadow-sm backdrop-blur-xl backdrop-saturate-150 hover:bg-background/65 dark:border-white/10 dark:bg-background/30 dark:hover:bg-background/45"
		>
			<Search className="absolute left-3 size-4 shrink-0" aria-hidden="true" />
			<span className="truncate text-xs md:text-sm">{fallbackTitle}</span>
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

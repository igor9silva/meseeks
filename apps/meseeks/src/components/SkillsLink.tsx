import { Link, useNavigate } from '@tanstack/react-router';
import { Loader2, Sparkles } from 'lucide-react';
import { Suspense, useTransition } from 'react';
import { Skeleton } from '@reactor/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { cn } from '@reactor/ui/lib/utils';

interface SkillsLinkProps {
	//
	className?: string;
}

export function SkillsLink({ className }: SkillsLinkProps) {
	//
	return (
		<Suspense fallback={<SkillsLinkSkeleton className={className} />}>
			<SkillsLinkContent className={className} />
		</Suspense>
	);
}

function SkillsLinkSkeleton({ className }: { className?: string }) {
	//
	return <Skeleton className={cn('h-9 w-9 rounded-full', className)} />;
}

function SkillsLinkContent({ className }: { className?: string }) {
	//
	const navigate = useNavigate();
	const [isNavigating, startTransition] = useTransition();

	const handleClick = () => {
		if (isNavigating) return;
		startTransition(() => {
			navigate({ to: '/$', params: { _splat: '.pro/skills' } });
		});
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						to="/$"
						params={{ _splat: '.pro/skills' }}
						onClick={handleClick}
						className={cn(
							'flex h-9 w-9 items-center justify-center flex-shrink-0',
							'rounded-full border border-input bg-transparent',
							'shadow-sm ring-offset-background hover:bg-accent hover:text-accent-foreground',
							'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
							isNavigating && 'pointer-events-none',
							className,
						)}
					>
						{isNavigating ? (
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						) : (
							<Sparkles className="size-4 text-muted-foreground" />
						)}
					</Link>
				</TooltipTrigger>
				<TooltipContent className="p-2 max-w-xs">
					<p className="text-xs text-muted-foreground">Open skills</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

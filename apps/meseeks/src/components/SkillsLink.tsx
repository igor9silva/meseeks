import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Loader2, Sparkles } from 'lucide-react';
import { Suspense, useTransition } from 'react';
import { Skeleton } from '@reactor/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { cn } from '@reactor/ui/lib/utils';
import { api } from 'convex/_generated/api';

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
	const skillKeys = useSkillKeys();
	const navigate = useNavigate();
	const [isNavigating, startTransition] = useTransition();

	const handleClick = () => {
		if (isNavigating) return;
		startTransition(() => {
			navigate({ to: '/skills' });
		});
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						to="/skills"
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
					{skillKeys.length > 0 ? (
						<>
							<p className="font-semibold mb-1">Skills</p>
							<ul className="ml-4 list-disc text-xs">
								{skillKeys.map((skill) => (
									<li key={skill}>{skill}</li>
								))}
							</ul>
							<p className="text-xs text-muted mt-2">click to manage</p>
						</>
					) : (
						<p className="text-xs text-muted-foreground">No skills</p>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function useSkillKeys() {
	//
	const query = convexQuery(api.skills.findAll, {});
	const { data } = useSuspenseQuery(query);
	return data.instincts.map((skill) => skill.key).concat(data.skills.map((skill) => skill.key));
}

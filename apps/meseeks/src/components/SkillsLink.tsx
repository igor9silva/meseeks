import { Link } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { Suspense } from 'react';
import { Skeleton } from '@reactor/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { useEnabledSkillsPreference } from '~/hooks/preferences';
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
	const { enabledSkills } = useEnabledSkillsPreference();

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						to="/skills"
						className={cn(
							'flex h-9 w-9 items-center justify-center flex-shrink-0',
							'rounded-full border border-input bg-transparent',
							'shadow-sm ring-offset-background hover:bg-accent hover:text-accent-foreground',
							'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
							className,
						)}
					>
						<Sparkles className="size-4 text-muted-foreground" />
					</Link>
				</TooltipTrigger>
				<TooltipContent className="p-2 max-w-xs">
					{enabledSkills.length > 0 ? (
						<>
							<p className="font-semibold mb-1">Enabled skills</p>
							<ul className="ml-4 list-disc text-xs">
								{enabledSkills.map((skill, index) => (
									<li key={index}>{skill}</li>
								))}
							</ul>
							<p className="text-xs text-muted mt-2">click to manage</p>
						</>
					) : (
						<p className="text-xs text-muted-foreground">No skills enabled</p>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { BasicError } from '~/components/BasicError';
import { UnifiedSkillForm } from '~/components/skills/UnifiedSkillForm';
import { CardDescription, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';

export const Route = createFileRoute('/skills_/$id')({
	component: RouteComponent,
	pendingComponent: Pending,
	errorComponent: () => <BasicError text="Not found (or something else went wrong)." />,
});

export default function RouteComponent() {
	//
	const { id } = Route.useParams();
	const query = convexQuery(api.skills.public.findOne, { skillId: id as Id<'skills'> });
	const { data: skill } = useSuspenseQuery(query);

	track('skills/$id', {
		skillId: id,
	});

	return (
		<div className="m-4">
			<div className="flex flex-row items-center justify-between my-4">
				<div>
					<CardTitle className="text-2xl">{skill.key}</CardTitle>
					{!skill.isEditable && (
						<CardDescription>
							This skill is managed by <span className="font-semibold">isPro</span> (the Meseeks team),
							and therefore cannot be edited.
						</CardDescription>
					)}
				</div>
			</div>
			<div>
				<UnifiedSkillForm skill={skill} isEditable={skill.isEditable} />
			</div>
		</div>
	);
}

function Pending() {
	//
	return (
		<div className="m-6">
			<div className="flex flex-row items-center justify-between my-4">
				<div>
					<Skeleton className="h-8 w-32 mb-2" /> {/* For CardTitle */}
					<Skeleton className="h-5 w-96 mb-1" /> {/* For CardDescription */}
					<Skeleton className="h-5 w-64" /> {/* For CardDescription second line */}
				</div>
			</div>
			<div className="space-y-6">
				<div className="space-y-4">
					<Skeleton className="h-6 w-64" /> {/* For form section title */}
					<div className="space-y-2">
						<Skeleton className="h-10 w-full" /> {/* For form inputs */}
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
				<div className="space-y-4">
					<Skeleton className="h-6 w-48" /> {/* For another form section */}
					<div className="space-y-2">
						<Skeleton className="h-20 w-full" /> {/* For text area */}
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
			</div>
		</div>
	);
}

import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { BasicError } from '~/components/BasicError';
import { InnateSkillDetail } from '~/components/skills/InnateSkillDetail';
import { Badge } from '~/components/ui/badge';
import { CardDescription, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { useInnateSkill } from '~/hooks/query/useSkills';

export const Route = createFileRoute('/skills_/innate_/$key')({
	component: RouteComponent,
	pendingComponent: Pending,
	errorComponent: () => <BasicError text="Not found (or something else went wrong)." />,
});

function RouteComponent() {
	//
	const { key } = Route.useParams();
	const { skill } = useInnateSkill(key);

	track('skills/innate/$key', {
		skillKey: key,
	});

	return (
		<div className="m-4">
			<div className="flex flex-row items-center justify-between my-4">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<CardTitle className="text-2xl">{skill.key}</CardTitle>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" className="text-xs">
								Innate
							</Badge>
							<Badge variant="outline" className="text-xs">
								Free
							</Badge>
						</div>
					</div>
					<CardDescription>
						This is an innate skill that is always available, but cannot be edited.
					</CardDescription>
				</div>
			</div>
			<div>
				<InnateSkillDetail skill={skill} />
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
					<Skeleton className="h-8 w-48 mb-2" />
					<Skeleton className="h-4 w-96" />
				</div>
			</div>
			<Skeleton className="h-96 w-full" />
		</div>
	);
}

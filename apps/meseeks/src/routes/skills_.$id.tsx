import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { Id } from 'convex/_generated/dataModel';
import { BasicError } from '~/components/BasicError';
import { HardSkillForm } from '~/components/skills/HardSkillForm';
import { SkillLearningInfoBox } from '~/components/skills/SkillLearningInfoBox';
import { SoftSkillForm } from '~/components/skills/SoftSkillForm';
import { Badge } from '@reactor/ui/badge';
import { CardDescription, CardTitle } from '@reactor/ui/card';
import { Skeleton } from '@reactor/ui/skeleton';
import { useSkill } from '~/hooks/query/useSkills';

export const Route = createFileRoute('/skills_/$id')({
	component: RouteComponent,
	pendingComponent: Pending,
	errorComponent: () => <BasicError text="Not found (or something else went wrong)." />,
});

function RouteComponent() {
	//
	const { id } = Route.useParams();
	const { skill } = useSkill(id as Id<'skills'>);

	track('skills/$id', { skillId: id });

	if (skill.kind === 'built-in') return '🚫';

	const getSkillTypeBadges = (kind: 'soft' | 'hard') => {
		return kind === 'soft' ? ['soft'] : ['hard', 'HTTP'];
	};

	return (
		<div className="m-4">
			<div className="flex flex-row items-center justify-between my-4">
				<div className="flex flex-wrap items-center gap-3">
					<CardTitle className="text-2xl">{skill.key}</CardTitle>
					<div className="flex flex-wrap items-center gap-1">
						{getSkillTypeBadges(skill.kind).map((badge) => (
							<Badge key={badge} variant="secondary">
								{badge}
							</Badge>
						))}
					</div>
				</div>
			</div>

			<div className="mb-4">
				<CardDescription>
					{!skill.isEditable && (
						<>
							This skill is managed by <span className="font-semibold">isPro</span> (the Meseeks team),
							and therefore cannot be edited.
						</>
					)}
				</CardDescription>
			</div>

			{skill.isEditable && <SkillLearningInfoBox query={`Hi. Please, update the skill '${skill.key}' to `} />}

			<div>
				{skill.kind === 'soft' ? (
					<SoftSkillForm skill={skill} isEditable={skill.isEditable} />
				) : (
					<HardSkillForm skill={skill} isEditable={skill.isEditable} />
				)}
			</div>
		</div>
	);
}

function Pending() {
	//
	return (
		<div className="m-6">
			<div className="flex flex-row items-center justify-between my-4">
				<div className="flex items-center gap-3">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-6 w-16" />
				</div>
			</div>
			<div className="mb-4">
				<Skeleton className="h-4 w-64" />
			</div>
			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		</div>
	);
}

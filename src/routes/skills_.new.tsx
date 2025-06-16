import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { UnifiedSkillForm } from '~/components/skills/UnifiedSkillForm';
import { CardDescription, CardTitle } from '~/components/ui/card';

export const Route = createFileRoute('/skills_/new')({
	component: RouteComponent,
});

export default function RouteComponent() {
	//
	track('skills/new', {});

	return (
		<div className="m-6">
			<div className="flex flex-row items-center justify-between my-4">
				<div>
					<CardTitle className="text-2xl">New skill</CardTitle>
					<CardDescription>
						Teach your companion a new skill. Skills are things Meseeks can perform.
					</CardDescription>
				</div>
			</div>
			<div>
				<UnifiedSkillForm />
			</div>
		</div>
	);
}

import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { useState } from 'react';
import { HardSkillForm } from '~/components/skills/HardSkillForm';
import { SoftSkillForm } from '~/components/skills/SoftSkillForm';
import { CardDescription, CardTitle } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

export const Route = createFileRoute('/skills_/new')({
	component: RouteComponent,
});

export default function RouteComponent() {
	//
	const [skillType, setSkillType] = useState<'soft' | 'hard'>('soft');

	track('skills/new');

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

			<Tabs value={skillType} onValueChange={(value) => setSkillType(value as 'soft' | 'hard')}>
				<TabsList>
					<TabsTrigger value="soft">Soft</TabsTrigger>
					<TabsTrigger value="hard">Hard</TabsTrigger>
				</TabsList>

				<CardDescription className="my-2">
					{skillType === 'soft'
						? 'Uses AI to make decisions, effectively controlling the reaction chain.'
						: 'Uses HTTP to connect to external apps and execute specific actions.'}
				</CardDescription>

				<TabsContent value="soft">
					<SoftSkillForm />
				</TabsContent>
				<TabsContent value="hard">
					<HardSkillForm />
				</TabsContent>
			</Tabs>
		</div>
	);
}

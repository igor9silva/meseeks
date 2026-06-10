import { convexQuery } from '@convex-dev/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import { api } from 'convex/_generated/api';
import { instinctSkills } from 'lib/reactor/instincts';
import { Badge } from '@reactor/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@reactor/ui/card';
import { SkillInputArguments } from '~/components/skills/SkillInputArguments';
import { SkillRunCard } from '~/components/skills/SkillRunCard';
import type { SkillInputArgument } from 'schemas/skillSchema';

export const Route = createFileRoute('/skills_/instinct_/$key')({
	component: InstinctSkillPage,
});

function InstinctSkillPage() {
	//
	const { key } = Route.useParams();
	const query = convexQuery(api.skills.findInstinct, { key });
	const { data } = useSuspenseQuery(query);

	return (
		<div className="h-full overflow-auto">
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
				<header className="space-y-3">
					<div className="flex items-center gap-2">
						<Wrench className="size-5 shrink-0 text-primary" />
						<h1 className="truncate text-2xl font-semibold">{data.name}</h1>
					</div>
					<div className="flex flex-wrap gap-2">
						<Badge>instinct</Badge>
						<Badge variant="secondary" className="font-mono">
							{data.key}
						</Badge>
					</div>
				</header>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Description</CardTitle>
						<CardDescription>Instincts are immutable core primitives exposed as skills.</CardDescription>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">{data.description}</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Input Arguments</CardTitle>
						<CardDescription>The arguments accepted by this instinct.</CardDescription>
					</CardHeader>
					<CardContent>
						<SkillInputArguments input={effectiveInstinctInput(data)} />
					</CardContent>
				</Card>

				<SkillRunCard skillKey={data.key} defaultArgs={defaultArgsForInstinct(data.key)} />

				{data.body && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Instructions</CardTitle>
							<CardDescription>The fixed instruction body used by this instinct.</CardDescription>
						</CardHeader>
						<CardContent>
							<pre className="max-h-[60svh] overflow-auto rounded border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
								{data.body}
							</pre>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}

function defaultArgsForInstinct(key: string) {
	//
	if (key === 'execute') {
		return {
			language: 'javascript',
			code: "console.log('execute ok')",
			outputs: [],
		};
	}

	return {};
}

function effectiveInstinctInput(skill: { key: string; input?: SkillInputArgument[] }) {
	//
	const instinct = instinctSkills.find((candidate) => candidate.key === skill.key);
	if (instinct) return instinct.input;

	return skill.input ?? [];
}

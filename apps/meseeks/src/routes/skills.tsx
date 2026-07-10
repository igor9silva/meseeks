import { convexQuery } from '@convex-dev/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus, Wrench } from 'lucide-react';
import { api } from 'convex/_generated/api';
import { managedSkills } from 'lib/proDefinitions';
import { instinctSkills } from 'lib/reactor/instincts';
import { Badge } from '@reactor/ui/badge';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@reactor/ui/card';
import { SkillInputSummary } from '~/components/skills/SkillInputArguments';
import type { SkillInputArgument } from 'schemas/skillSchema';

export const Route = createFileRoute('/skills')({
	component: SkillsPage,
});

function SkillsPage() {
	//
	const query = convexQuery(api.skills.findAll, {});
	const { data } = useSuspenseQuery(query);

	return (
		<div className="h-full overflow-auto">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
				<header className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
						<p className="text-sm text-muted-foreground">Built-in and custom execution primitives.</p>
					</div>
					<Button asChild>
						<Link to="/skills/new">
							<Plus className="size-4" />
							New
						</Link>
					</Button>
				</header>

				<section className="space-y-3">
					<h2 className="text-sm font-medium text-muted-foreground">Instincts</h2>
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{data.instincts.map((skill) => (
							<Link
								key={skill.key}
								to="/skills/instinct/$key"
								params={{ key: skill.key }}
								className="block h-full"
							>
								<Card className="h-full transition-colors hover:bg-accent/40">
									<CardHeader>
										<div className="flex items-start gap-3">
											<Wrench className="mt-1 size-4 shrink-0 text-primary" />
											<div className="min-w-0 flex-1">
												<CardTitle className="truncate text-base">{skill.name}</CardTitle>
												<CardDescription className="truncate font-mono text-xs">
													{skill.key}
												</CardDescription>
											</div>
											<Badge variant="secondary">instinct</Badge>
										</div>
									</CardHeader>
									<CardContent className="space-y-2 text-xs text-muted-foreground">
										<p>{skill.description}</p>
										<div className="font-mono">
											<SkillInputSummary input={effectiveInstinctInput(skill)} />
										</div>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				</section>

				<section className="space-y-3">
					<h2 className="text-sm font-medium text-muted-foreground">Skills</h2>
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{data.skills.map((skill) => (
							<Link key={skill._id} to="/skills/$id" params={{ id: skill._id }} className="block h-full">
								<Card className="h-full transition-colors hover:bg-accent/40">
									<CardHeader>
										<div className="flex items-start gap-3">
											<Wrench className="mt-1 size-4 shrink-0 text-primary" />
											<div className="min-w-0 flex-1">
												<CardTitle className="truncate text-base">{skill.name}</CardTitle>
												<CardDescription className="truncate font-mono text-xs">
													{skill.key}
												</CardDescription>
											</div>
											<Badge variant="secondary">{skill.kind}</Badge>
										</div>
									</CardHeader>
									<CardContent className="space-y-2 text-xs text-muted-foreground">
										<p>{skill.description}</p>
										{skill.sourceKey && <p className="font-mono">{skill.sourceKey}</p>}
										<div className="font-mono">
											<SkillInputSummary input={effectiveManagedSkillInput(skill)} />
										</div>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>

					{data.skills.length === 0 && (
						<Card>
							<CardContent className="p-4 text-sm text-muted-foreground">No skills found.</CardContent>
						</Card>
					)}
				</section>
			</div>
		</div>
	);
}

function effectiveInstinctInput(skill: { key: string; input?: SkillInputArgument[] }) {
	//
	const instinct = instinctSkills.find((candidate) => candidate.key === skill.key);
	if (instinct) return instinct.input;

	return skill.input ?? [];
}

function effectiveManagedSkillInput(skill: { key: string; input?: SkillInputArgument[] }) {
	//
	if (skill.input && skill.input.length > 0) return skill.input;

	return managedSkills.find((candidate) => candidate.key === skill.key)?.input ?? [];
}

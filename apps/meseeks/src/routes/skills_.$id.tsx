import { convexQuery } from '@convex-dev/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { FileCode2, Wrench } from 'lucide-react';
import { api } from 'convex/_generated/api';
import { managedSkills } from 'lib/proDefinitions';
import { Badge } from '@pro/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@pro/ui/card';
import { SkillInputArguments } from '~/components/skills/SkillInputArguments';
import { SkillRunCard } from '~/components/skills/SkillRunCard';
import type { SkillInputArgument } from 'schemas/skillSchema';

export const Route = createFileRoute('/skills_/$id')({
	component: SkillPage,
});

function SkillPage() {
	//
	const { id } = Route.useParams();

	return <SkillDetail id={id} />;
}

function SkillDetail({ id }: { id: string }) {
	//
	const query = convexQuery(api.skills.findOne, { id });
	const { data } = useSuspenseQuery(query);

	return (
		<div className="h-full overflow-auto">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
				<header className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0 space-y-2">
						<div className="flex items-center gap-2">
							<Wrench className="size-5 shrink-0 text-primary" />
							<h1 className="truncate text-2xl font-semibold">{data.name}</h1>
						</div>
						<div className="flex flex-wrap gap-2">
							<Badge>{data.kind}</Badge>
							<Badge variant="secondary" className="font-mono">
								{data.key}
							</Badge>
							{data.sourceKey && <Badge variant="outline">{data.sourceKey}</Badge>}
						</div>
					</div>
					<Badge variant="outline" className="gap-1">
						<FileCode2 className="size-3" />
						{data.fileName ?? 'skill file'}
					</Badge>
				</header>

				<section className="grid gap-4 lg:grid-cols-3">
					<Card className="min-w-0 lg:col-span-2">
						<CardHeader>
							<CardTitle className="text-base">File</CardTitle>
							<CardDescription>The file body used by this skill.</CardDescription>
						</CardHeader>
						<CardContent>
							<pre className="max-h-[60svh] overflow-auto rounded border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
								{data.body || 'No body.'}
							</pre>
						</CardContent>
					</Card>

					<div className="space-y-4">
						<SkillRunCard skillKey={data.key} />

						<Card>
							<CardHeader>
								<CardTitle className="text-base">Input Arguments</CardTitle>
								<CardDescription>The arguments accepted by this skill.</CardDescription>
							</CardHeader>
							<CardContent>
								<SkillInputArguments input={effectiveManagedSkillInput(data)} />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">Source</CardTitle>
							</CardHeader>
							<CardContent>
								<pre className="max-h-72 overflow-auto rounded border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap break-words">
									{JSON.stringify(
										{
											file: data.file,
											fileName: data.fileName,
											sourceOwner: data.sourceOwner,
											sourceKey: data.sourceKey,
											sourceFile: data.sourceFile,
											isPublic: data.isPublic,
										},
										null,
										2,
									)}
								</pre>
							</CardContent>
						</Card>
					</div>
				</section>
			</div>
		</div>
	);
}

function effectiveManagedSkillInput(skill: { key: string; input?: SkillInputArgument[] }) {
	//
	if (skill.input && skill.input.length > 0) return skill.input;

	return managedSkills.find((candidate) => candidate.key === skill.key)?.input ?? [];
}

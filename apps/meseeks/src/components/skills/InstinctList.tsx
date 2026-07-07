import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@reactor/ui/card';
import { Badge } from '@reactor/ui/badge';
import { useInstincts } from '~/hooks/query/useSkills';

export function InstinctList() {
	//
	const { skills } = useInstincts();

	if (skills.length === 0) {
		return <p className="py-6 text-center text-muted-foreground">No instincts found.</p>;
	}

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{skills.map((skill) => (
				<Card key={skill.key} className="flex h-full flex-col">
					<CardHeader className="p-4 pb-2">
						<div className="flex items-start justify-between gap-2">
							<div>
								<CardTitle className="text-lg">{skill.key}</CardTitle>
								<CardDescription className="mt-1 line-clamp-2 min-h-10">
									{skill.description}
								</CardDescription>
							</div>
							<Badge variant="secondary">instinct</Badge>
						</div>
					</CardHeader>
					<CardContent className="mt-auto p-4 pt-2 text-xs text-muted-foreground">
						code-owned skill
					</CardContent>
				</Card>
			))}
		</div>
	);
}

import { useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { useInnateSkills } from '~/hooks/query/useSkills';

export function InnateSkillsList() {
	//
	const [searchTerm, setSearchTerm] = useState('');
	const { skills: innateSkills } = useInnateSkills();

	const filteredSkills = innateSkills?.filter(
		(skill) =>
			skill.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
			skill.description.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return (
		<div className="space-y-4">
			<Input
				placeholder="Search innate skills..."
				value={searchTerm}
				onChange={(e) => setSearchTerm(e.target.value)}
			/>

			{filteredSkills?.length === 0 && searchTerm.length > 0 ? (
				<div className="text-center py-6">
					<p className="text-muted-foreground">No innate skills found for "{searchTerm}"</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredSkills?.map((skill) => (
						<Card key={skill.key} className="flex flex-col p-4 gap-1">
							<CardHeader className="p-0">
								<div className="flex justify-between items-start gap-2">
									<CardTitle className="text-lg">{skill.key}</CardTitle>
									<div className="flex items-center gap-2 mt-1">
										<Badge variant="secondary" className="text-xs">
											Innate
										</Badge>
										<Badge variant="outline" className="text-xs">
											Free
										</Badge>
									</div>
								</div>
							</CardHeader>
							<CardContent className="flex flex-1 p-0 items-center">
								<CardDescription className="line-clamp-2">{skill.description}</CardDescription>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

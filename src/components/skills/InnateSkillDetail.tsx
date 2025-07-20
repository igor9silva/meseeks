import { asDollars } from 'convex/lib/money';
import { builtInSkillSchema } from 'convex/schemas/skillSchema';
import { z } from 'zod';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { parseJsonSchemaToProperties } from '~/lib/json-schema-parser';

type InnateSkill = z.infer<typeof builtInSkillSchema>;

export function InnateSkillDetail({ skill }: { skill: InnateSkill }) {
	//
	return (
		<div className="space-y-6">
			<p className="text-muted-foreground">{skill.description}</p>

			<Card>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<h4 className="font-medium text-sm mb-1">Cost</h4>
							<p className="text-sm text-muted-foreground">Free</p>
						</div>
						<div>
							<h4 className="font-medium text-sm mb-1">Authorization</h4>
							<p className="text-sm text-muted-foreground">
								<PreApprovedCost cost={skill.preApprovedCost} />
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="space-y-0">
					<CardTitle className="text-lg">Parameters</CardTitle>
					<CardDescription className="text-sm">Input info for this skill.</CardDescription>
				</CardHeader>
				<CardContent className="pt-0">
					<InputSchema schema={skill.inputSchema} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="space-y-0">
					<CardTitle className="text-lg">Known reactions</CardTitle>
					<CardDescription className="text-sm">
						Re-actions known to happen when this skill is used.
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-0">
					{skill.knownReactions && skill.knownReactions.length > 0 ? (
						<div className="space-y-3">
							{skill.knownReactions.map((reaction, index) => (
								<div key={index} className="flex items-start gap-3 p-3 border rounded-md">
									<div className="flex-1">
										<h4 className="font-medium text-sm">{reaction.skillKey}</h4>
										<p className="text-xs text-muted-foreground mt-1">
											<Condition condition={reaction.condition} />
										</p>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">None.</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function PreApprovedCost({ cost }: { cost: bigint | 'none' }) {
	//
	if (cost === 'none') return <>Always requires explicit authorization</>;
	if (cost === 0n) return <>Automatically authorized while free</>;

	return <>Automatically authorized up to estimated cost ≤ {asDollars({ bigInt: cost })}</>;
}

function Condition({ condition }: { condition: 'owner' | 'companion' | 'any' }) {
	//
	switch (condition) {
		case 'owner':
			return 'Occurs when performed by user';
		case 'companion':
			return 'Occurs when run by Meseeks';
		case 'any':
			return 'Occurs regardless of who performs it';
		default:
			return condition;
	}
}

function InputSchema({ schema }: { schema: string }) {
	//
	const properties = parseJsonSchemaToProperties(schema);

	if (properties.length === 0) {
		return <p className="text-sm text-muted-foreground">No parameters required</p>;
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-b">
						<th className="text-left p-2 font-medium text-sm">Property</th>
						<th className="text-left p-2 font-medium text-sm">Type</th>
						<th className="text-left p-2 font-medium text-sm">Required</th>
						<th className="text-left p-2 font-medium text-sm">Description</th>
					</tr>
				</thead>
				<tbody>
					{properties.map((prop) => (
						<tr key={prop.name} className="border-b last:border-b-0">
							<td className="p-2">
								<code className="text-sm bg-muted px-1 py-0.5 rounded">{prop.name}</code>
							</td>
							<td className="p-2">
								<Badge variant="outline" className="text-xs">
									{prop.type}
								</Badge>
							</td>
							<td className="p-2">
								<Badge variant={prop.required ? 'destructive' : 'secondary'} className="text-xs">
									{prop.required ? 'yes' : 'no'}
								</Badge>
							</td>
							<td className="p-2 text-sm">
								<div>
									{prop.description}
									{prop.constraints && (
										<div className="text-xs text-muted-foreground mt-1 space-y-0.5">
											{prop.constraints.map((constraint, i) => (
												<div key={i}>{constraint}</div>
											))}
										</div>
									)}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

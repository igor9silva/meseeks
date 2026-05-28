import { asDollars } from 'lib/money';
import { builtInSkillSchema } from 'schemas/skillSchema';
import { z } from 'zod/v3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@reactor/ui/card';
import { InputSchemaDisplay } from './shared/InputSchemaDisplay';

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
					<InputSchemaDisplay schema={skill.inputSchema} />
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
									<h4 className="font-medium text-sm">
										{reaction.skillKey}{' '}
										<span className="text-xs text-muted-foreground mt-1">
											(<Condition condition={reaction.condition} />)
										</span>
									</h4>
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
	if (cost === BigInt('0')) return <>Automatically authorized while free</>;

	return <>Automatically authorized up to estimated cost ≤ {asDollars({ bigInt: cost })}</>;
}

function Condition({ condition }: { condition: 'owner' | 'companion' | 'any' }) {
	//
	switch (condition) {
		case 'owner':
			return 'if performed by you';
		case 'companion':
			return 'if performed by Meseeks';
		case 'any':
			return 'always';
		default:
			return condition;
	}
}

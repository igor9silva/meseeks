import { Info, Sparkles } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';

interface SkillLearningInfoBoxProps {
	skillName?: string;
}

export function SkillLearningInfoBox({ skillName = 'a new skill' }: SkillLearningInfoBoxProps) {
	//
	const learnQuery = `Hi. Please learn ${skillName} as a new skill.`;

	return (
		<Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 mb-6">
			<CardContent className="flex items-center gap-3 p-4">
				<Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
				<div className="text-blue-800 dark:text-blue-200 flex items-center justify-between w-full">
					<div className="flex-1">
						<span className="font-medium">Tip: </span>
						Instead of filling everything manually, you can ask Meseeks to learn this skill for you. Just
						describe what you want and let AI figure out the technical details.
					</div>
					<a href={`/?q=${encodeURIComponent(learnQuery)}`} className="ml-4">
						<Button
							variant="outline"
							size="sm"
							className="bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/70"
						>
							<Sparkles className="h-4 w-4 mr-2" />
							Ask Meseeks to learn
						</Button>
					</a>
				</div>
			</CardContent>
		</Card>
	);
}

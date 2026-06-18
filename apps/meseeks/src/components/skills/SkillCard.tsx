import { Link } from '@tanstack/react-router';
import { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'lib/money';
import { INTELLIGENCES } from 'schemas/intelligenceSchema';
import { Share } from 'lucide-react';
import { Badge } from '@reactor/ui/badge';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@reactor/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { cn } from '@reactor/ui/lib/utils';
import { SkillTooltip } from './SkillTooltip';

/**
 * Skill card with basic information and available actions
 */
export function SkillCard({
	skill,
	onShareSkill,
}: {
	skill: Doc<'skills'>;
	onShareSkill?: (skill: Doc<'skills'>) => void;
}) {
	//
	const isSpecial = skill.priority !== undefined; // TODO: hack
	const availableSkills = skill.source !== 'instinct' && skill.kind === 'think' ? skill.config.availableSkills : [];

	// Card content to avoid duplication
	const CardWrapper = ({ children }: { children: React.ReactNode }) => (
		<Card className={cn('flex flex-col h-full transition-opacity', isSpecial && 'ring-1 ring-primary/20')}>
			{children}
		</Card>
	);

	const cardContent = (
		<>
			<CardHeader className="p-4 pb-2">
				<div className="flex justify-between items-start">
					<div>
						<CardTitle className="text-lg">{skill.key}</CardTitle>
						<CardDescription className="mt-1 line-clamp-2 min-h-[40px]">
							{skill.description}
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex-grow p-4 pt-2">
				<div className="grid grid-rows-[auto_auto] gap-2 h-full">
					<div className="flex flex-wrap items-center gap-2">
						{skill.source === 'instinct' ? (
							<Badge variant="secondary" className="text-xs font-medium">
								instinct
							</Badge>
						) : skill.kind === 'think' ? (
							<Badge variant="secondary" className="text-xs font-medium">
								{skill.config.model}
							</Badge>
						) : skill.kind === 'request' ? (
							<Badge variant="secondary">HTTP</Badge>
						) : (
							<Badge variant="secondary">Execute</Badge>
						)}

						{availableSkills.length > 0 && (
							<SkillTooltip
								badgeLabel={availableSkills.length === 1 ? 'skill' : 'skills'}
								tooltipTitle="Model can choose between"
								items={availableSkills}
							/>
						)}
					</div>

					<CardFooter skill={skill} onShareSkill={onShareSkill} />
				</div>
			</CardContent>
		</>
	);

	return (
		<Link to="/skills/$id" params={{ id: skill._id }} className="block transition-all focus:shadow-md outline-none">
			<CardWrapper>{cardContent}</CardWrapper>
		</Link>
	);
}

function CardFooter({
	skill,
	onShareSkill,
}: {
	skill: Doc<'skills'>; //
	onShareSkill?: (skill: Doc<'skills'>) => void;
}) {
	//
	const isUserOwnedSkill = skill.owner !== 'isPro';

	const handleShareClick = (event: React.MouseEvent) => {
		//
		event.preventDefault();
		event.stopPropagation();
		if (onShareSkill) onShareSkill(skill);
	};

	return (
		<div className="mt-auto pt-2 border-t text-xs text-muted-foreground">
			<div className={cn('flex items-center', isUserOwnedSkill ? 'justify-between' : 'justify-center')}>
				<Pricing skill={skill} />
				{isUserOwnedSkill && onShareSkill && <ShareButton onClick={handleShareClick} />}
			</div>
		</div>
	);
}

function ShareButton({ onClick }: { onClick: (event: React.MouseEvent) => void }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="ghost" size="icon" onClick={onClick} className="h-6 w-6">
						<Share className="h-3 w-3" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Share</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function Pricing({ skill }: { skill: Doc<'skills'> }) {
	//
	if (skill.source === 'instinct') return <span>instinct</span>;

	if (skill.cost !== 'dynamic') {
		return (
			<div className="flex items-center justify-center">
				{skill.cost === 0n ? (
					<span>Free</span>
				) : (
					<span>{asDollars({ bigInt: skill.cost, precision: 4 })}$ per use</span>
				)}
			</div>
		);
	}

	if (skill.kind !== 'think') {
		return <span>{skill.kind}</span>;
	}

	if (skill.config.model === 'auto') {
		return (
			<div className="flex items-center justify-center">
				<span>Cost depends on selected action intelligence</span>
			</div>
		);
	}

	const price = INTELLIGENCES[skill.config.model].pricing;

	return (
		<div className="flex items-center justify-between w-full">
			<span>{asDollars({ bigInt: price.inputPerMillionToken })}$/million tokens in</span>
			<span>{asDollars({ bigInt: price.outputPerMillionToken })}$/million tokens out</span>
		</div>
	);
}

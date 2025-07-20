import { Link } from '@tanstack/react-router';
import { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'convex/lib/money';
import { pricingFor } from 'convex/schemas/skillSchema';
import { Share } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { SkillTooltip } from './SkillTooltip';

/**
 * Skill card with basic information and available actions
 */
export function SkillCard({
	skill,
	isEnabled,
	onToggle,
	onShareSkill,
}: {
	skill: Doc<'skills'>;
	isEnabled: boolean;
	onToggle: (isEnabled: boolean) => void;
	onShareSkill?: (skill: Doc<'skills'>) => void;
}) {
	//
	const availableSkills = skill.kind === 'soft' ? skill.config?.availableSkills ?? [] : [];
	const hasTaskSkills = availableSkills.includes('{{taskSkills}}');
	const knownReactions = skill.kind === 'hard' ? skill.knownReactions ?? [] : [];

	const handleToggle = (event: React.MouseEvent) => {
		//
		event.preventDefault();
		event.stopPropagation();
		onToggle(!isEnabled);
	};

	// Card content to avoid duplication
	const CardWrapper = ({ children }: { children: React.ReactNode }) => (
		<Card className={cn('flex flex-col h-full transition-opacity', !isEnabled && 'opacity-50')}>{children}</Card>
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
					<ToggleSwitch
						checked={isEnabled}
						onClick={handleToggle}
						tooltip={`${isEnabled ? 'Disable' : 'Enable'} skill (must be enabled to use)`}
						aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${skill.key} skill`}
						className="mt-1"
					/>
				</div>
			</CardHeader>
			<CardContent className="flex-grow p-4 pt-2">
				<div className="grid grid-rows-[auto_auto] gap-2 h-full">
					<div className="flex items-center gap-2">
						{skill.kind === 'soft' ? (
							<Badge variant="secondary" className="text-xs font-medium">
								{skill.config.model}
							</Badge>
						) : (
							<Badge variant="secondary">HTTP</Badge>
						)}

						{availableSkills.length > 0 && (
							<SkillTooltip
								badgeLabel={availableSkills.length === 1 ? 'skill' : 'skills'}
								tooltipTitle="Model can choose between"
								items={availableSkills}
							/>
						)}

						{hasTaskSkills && (
							<Badge variant="outline" className="text-xs">
								Task skills
							</Badge>
						)}

						{knownReactions.length > 0 && (
							<SkillTooltip
								badgeLabel={knownReactions.length === 1 ? 'reaction' : 'reactions'}
								tooltipTitle="Known reactions"
								items={knownReactions.map((reaction) => reaction.skillKey)}
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

function CardFooter({ skill, onShareSkill }: { skill: Doc<'skills'>; onShareSkill?: (skill: Doc<'skills'>) => void }) {
	//
	const isUserOwnedSkill = skill.owner !== 'isPro' && skill.owner !== 'built-in';

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

function ToggleSwitch({
	checked,
	onClick,
	tooltip,
	...props
}: {
	checked: boolean;
	onClick: (event: React.MouseEvent) => void;
	tooltip?: string;
} & React.ComponentPropsWithoutRef<typeof Switch>) {
	//
	const switchComponent = <Switch checked={checked} onClick={onClick} {...props} />;

	if (!tooltip) return switchComponent;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="cursor-pointer">{switchComponent}</div>
				</TooltipTrigger>
				<TooltipContent>{tooltip}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function Pricing({ skill }: { skill: Doc<'skills'> }) {
	//

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

	if (skill.config.model === 'auto') {
		return (
			<div className="flex items-center justify-center">
				<span>Cost depends on selected task intelligence</span>
			</div>
		);
	}

	const price = pricingFor(skill.config.model);

	return (
		<div className="flex items-center justify-between w-full">
			<span>{asDollars({ bigInt: price.inputToken * 1_000_000n })}$/million tokens in</span>
			<span>{asDollars({ bigInt: price.outputToken * 1_000_000n })}$/million tokens out</span>
		</div>
	);
}

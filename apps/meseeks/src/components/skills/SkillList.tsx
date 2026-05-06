import { Link } from '@tanstack/react-router';
import { Doc } from 'convex/_generated/dataModel';
import { PlusCircle } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { SkillCardSkeleton } from './SkillCardSkeleton';
import { SkillListContent } from './SkillListContent';

/**
 * Main skills list component that:
 * 1. Renders the search input for filtering skills
 * 2. Uses suspense to show loading state
 * 3. Uses URL-based tab state (handled by parent component)
 */
export function SkillList({
	filter, //
	shouldShowLearnButton = false,
	onShareSkill,
}: {
	filter: 'personal' | 'public';
	shouldShowLearnButton?: boolean;
	onShareSkill?: (skill: Doc<'skills'>) => void;
}) {
	//
	const [searchTerm, setSearchTerm] = useState('');

	return (
		<div className="space-y-4">
			<div className="flex items-center space-x-2">
				<Input
					placeholder="Search skills..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
				{shouldShowLearnButton && (
					<Link to="/skills/new">
						<Button>
							<PlusCircle />
							Learn
						</Button>
					</Link>
				)}
			</div>

			<Suspense
				fallback={
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{Array.from({ length: 6 }).map((_, i) => (
							<SkillCardSkeleton key={i} />
						))}
					</div>
				}
			>
				<SkillListContent filter={filter} searchTerm={searchTerm} onShareSkill={onShareSkill} />
			</Suspense>
		</div>
	);
}

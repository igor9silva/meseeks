import { Button } from '~/components/ui/button';

interface SkillFormActionsProps {
	isSubmitting: boolean;
	isEditable: boolean;
}

export function SkillFormActions({ isSubmitting, isEditable }: SkillFormActionsProps) {
	//
	return (
		<div className="flex justify-end">
			<Button type="submit" disabled={!isEditable || isSubmitting}>
				{isSubmitting ? 'Saving...' : 'Save'}
			</Button>
		</div>
	);
}

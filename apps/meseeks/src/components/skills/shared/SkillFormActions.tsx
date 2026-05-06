import { Button } from '~/components/ui/button';

interface SkillFormActionsProps {
	isSubmitting: boolean;
	isEditable: boolean;
}

export function SkillFormActions({ isSubmitting, isEditable }: SkillFormActionsProps) {
	//
	if (!isEditable) return null;

	return (
		<div className="flex justify-end">
			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Saving...' : 'Save'}
			</Button>
		</div>
	);
}

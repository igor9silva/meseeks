import { Button } from '~/components/ui/button';

interface FormActionsProps {
	isEditing?: boolean;
	isCloning?: boolean;
	onCancel?: () => void;
	isSubmitting?: boolean;
}

export function FormActions({
	isEditing = false,
	isCloning = false,
	onCancel = () => {},
	isSubmitting = false,
}: FormActionsProps) {
	//
	const actionText = isEditing && !isCloning ? 'Update' : 'Learn';

	return (
		<div className="flex justify-end gap-2">
			<Button type="button" variant="outline" onClick={onCancel}>
				Cancel
			</Button>
			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Saving...' : `${actionText} skill`}
			</Button>
		</div>
	);
}

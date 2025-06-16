import { useState } from 'react';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';

type EditableContentProps = {
	value: string;
	onSave: (value: string) => void;
	multiline?: boolean;
	viewClassName?: string;
	editClassName?: string;
	asView?: (props: {
		value: string; //
		className?: string;
		enterEditMode: (e: React.MouseEvent | React.TouchEvent) => void;
		isEmpty: boolean;
	}) => React.ReactNode;
	as?: keyof JSX.IntrinsicElements;
};

export function EditableContent({
	value,
	onSave,
	multiline = false,
	viewClassName,
	editClassName,
	asView,
	as: Component = 'div',
}: EditableContentProps) {
	//
	const [isEditing, setIsEditing] = useState(false);
	const [editedValue, setEditedValue] = useState(value);

	const enterEditMode = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsEditing(true);
	};

	const saveChanges = () => {
		setIsEditing(false);

		// only save if the value has changed
		if (editedValue !== value) onSave(editedValue);
	};

	// cancel on ESC, confirm on Enter (or CMD+Enter for multiline)
	const handleKeyDown = (e: React.KeyboardEvent) => {
		//
		if (e.key === 'Escape') {
			setIsEditing(false);
			setEditedValue(value);
		} else if (e.key === 'Enter') {
			if (!multiline) {
				e.preventDefault();
				saveChanges();
			} else if (e.metaKey || e.ctrlKey) {
				e.preventDefault();
				saveChanges();
			}
		}
	};

	const InputComponent = multiline ? Textarea : Input;

	const isEmpty = !editedValue || !editedValue.trim();

	if (isEditing) {
		return (
			<InputComponent
				value={editedValue}
				onChange={(e) => setEditedValue(e.target.value)}
				onBlur={saveChanges}
				onKeyDown={handleKeyDown}
				className={cn(
					'w-full bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary',
					editClassName,
				)}
				autoFocus
			/>
		);
	}

	return (
		<Component
			className={cn('cursor-magic', viewClassName)}
			onMouseUp={(e) => {
				//
				// middle click
				if (e.button === 1) enterEditMode(e);
			}}
			onTouchStart={(e) => {
				//
				// three finger tap
				if (e.touches.length === 3) enterEditMode(e);
			}}
		>
			{asView ? asView({ value, enterEditMode, className: viewClassName, isEmpty }) : editedValue}
		</Component>
	);
}

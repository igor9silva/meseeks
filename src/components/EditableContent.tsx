import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { JSX } from 'react';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';

type EditableContentProps = {
	value: string;
	onSave: (value: string) => void;
	multiline?: boolean;
	viewClassName?: string;
	editClassName?: string;
	isPending?: boolean;
	asView?: (props: {
		value: string; //
		className?: string;
		enterEditMode: (e: React.MouseEvent | React.TouchEvent) => void;
		isEmpty: boolean;
		isPending?: boolean;
	}) => React.ReactNode;
	as?: keyof JSX.IntrinsicElements;
};

export function EditableContent({
	value,
	onSave,
	multiline = false,
	viewClassName,
	editClassName,
	isPending = false,
	asView,
	as: Component = 'div',
}: EditableContentProps) {
	//
	const [isEditing, setIsEditing] = useState(false);
	const [editedValue, setEditedValue] = useState(value);

	const enterEditMode = (e: React.MouseEvent | React.TouchEvent) => {
		//
		if (isPending) return;
		e.preventDefault();
		e.stopPropagation();
		setIsEditing(true);
	};

	const saveChanges = () => {
		//
		if (isPending) return;
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

	if (isEditing) {
		return (
			<InputComponent
				value={editedValue}
				onChange={(e) => setEditedValue(e.target.value)}
				onBlur={saveChanges}
				onKeyDown={handleKeyDown}
				disabled={isPending}
				className={cn(
					'w-full bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary',
					isPending && 'opacity-50 cursor-not-allowed',
					editClassName,
				)}
				autoFocus
			/>
		);
	}

	// Show new content during pending state, old content otherwise
	const displayValue = isPending ? editedValue : value;
	const displayIsEmpty = !displayValue || !displayValue.trim();

	return (
		<div className="relative">
			<Component
				className={cn('cursor-magic', isPending && 'opacity-50 cursor-not-allowed', viewClassName)}
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
				{asView
					? asView({
							value: displayValue,
							enterEditMode,
							className: viewClassName,
							isEmpty: displayIsEmpty,
							isPending,
						})
					: displayValue}
			</Component>
			{isPending && (
				<div className="absolute top-2 right-2 pointer-events-none">
					<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				</div>
			)}
		</div>
	);
}

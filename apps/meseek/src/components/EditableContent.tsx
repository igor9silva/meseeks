import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { JSX, KeyboardEvent, MouseEvent, TouchEvent } from 'react';
import { Input } from '@reactor/ui/input';
import { Textarea } from '@reactor/ui/textarea';
import { useDoubleTap } from '@reactor/ui/hooks/useDoubleTap';
import { cn } from '@reactor/ui/lib/utils';

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
		enterEditMode: (e: MouseEvent | TouchEvent) => void;
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
	const inputRef = useRef<HTMLInputElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (!isEditing) return;
		if (multiline) {
			textareaRef.current?.focus();
			return;
		}
		inputRef.current?.focus();
	}, [isEditing, multiline]);

	const enterEditMode = (e: MouseEvent | TouchEvent) => {
		//
		if (isPending) return;
		e.preventDefault();
		e.stopPropagation();
		setIsEditing(true);
	};

	const handleDoubleTap = useDoubleTap((event) => enterEditMode(event));

	const saveChanges = () => {
		//
		if (isPending) return;
		setIsEditing(false);

		// only save if the value has changed
		if (editedValue !== value) onSave(editedValue);
	};

	// cancel on ESC, confirm on Enter (or CMD+Enter for multiline)
	const handleKeyDown = (e: KeyboardEvent) => {
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

	if (isEditing) {
		const sharedClassName = cn(
			'w-full bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary',
			isPending && 'opacity-50 cursor-not-allowed',
			editClassName,
		);

		if (multiline) {
			return (
				<Textarea
					ref={textareaRef}
					value={editedValue}
					onChange={(e) => setEditedValue(e.target.value)}
					onBlur={saveChanges}
					onKeyDown={handleKeyDown}
					disabled={isPending}
					className={sharedClassName}
				/>
			);
		}

		return (
			<Input
				ref={inputRef}
				value={editedValue}
				onChange={(e) => setEditedValue(e.target.value)}
				onBlur={saveChanges}
				onKeyDown={handleKeyDown}
				disabled={isPending}
				className={sharedClassName}
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
				onDoubleClick={enterEditMode}
				onTouchEnd={handleDoubleTap}
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

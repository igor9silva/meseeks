import { useCallback, useEffect, useRef, useState } from 'react';

interface UseExpandingTextareaOptions {
	//
	maxHeight?: number;
	initialValue?: string;
	singleLineHeight?: number;
}

interface UseExpandingTextareaResult {
	//
	textareaRef: React.RefObject<HTMLTextAreaElement>;
	value: string;
	isEmpty: boolean;
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	setValue: React.Dispatch<React.SetStateAction<string>>;
	adjustHeight: () => void;
}

export function useExpandingTextarea(options: UseExpandingTextareaOptions = {}): UseExpandingTextareaResult {
	//
	const { initialValue = '', maxHeight = 240, singleLineHeight = 40 } = options;
	const [value, setValue] = useState(initialValue);
	const [isEmpty, setIsEmpty] = useState(!initialValue.trim());
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const adjustHeight = useCallback(() => {
		//
		if (!textareaRef.current) return;

		// Temporarily set to single line height to measure if content fits
		textareaRef.current.style.height = `${singleLineHeight}px`;

		// Check if content overflows single line height
		const needsExpansion = textareaRef.current.scrollHeight > singleLineHeight + 5;

		if (needsExpansion) {
			// Set to auto briefly to get the natural scroll height
			textareaRef.current.style.height = 'auto';
			const naturalHeight = textareaRef.current.scrollHeight;
			const newHeight = Math.min(naturalHeight, maxHeight);
			textareaRef.current.style.height = `${newHeight}px`;
		} else {
			// Content fits in single line, keep single line height
			textareaRef.current.style.height = `${singleLineHeight}px`;
		}
		//
	}, [maxHeight, singleLineHeight]);

	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			//
			setValue(e.target.value);
			adjustHeight();
		},
		[adjustHeight],
	);

	useEffect(() => {
		setIsEmpty(value.trim().length === 0);
	}, [value]);

	// Adjust height when content changes programmatically
	useEffect(() => {
		adjustHeight();
	}, [value, adjustHeight]);

	// Set initial height and focus on first render
	useEffect(() => {
		if (textareaRef.current) {
			// Set initial height immediately to prevent flicker
			textareaRef.current.style.height = `${singleLineHeight}px`;
			textareaRef.current.focus();
		}
	}, [singleLineHeight]);

	return {
		textareaRef,
		value,
		isEmpty,
		onChange,
		setValue,
		adjustHeight,
	};
}

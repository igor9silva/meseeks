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

		textareaRef.current.style.height = 'auto';

		// Use single line height by default, expand only when content overflows
		textareaRef.current.style.height = `${singleLineHeight}px`;

		// If content overflows single line height, expand to accommodate it
		const needsExpansion = textareaRef.current.scrollHeight > singleLineHeight + 5;
		const newHeight = needsExpansion ? Math.min(textareaRef.current.scrollHeight, maxHeight) : singleLineHeight;

		textareaRef.current.style.height = `${newHeight}px`;
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

	// Focus on first render
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.focus();
		}
	}, []);

	return {
		textareaRef,
		value,
		isEmpty,
		onChange,
		setValue,
		adjustHeight,
	};
}

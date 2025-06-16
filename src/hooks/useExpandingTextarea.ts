import { useCallback, useEffect, useRef, useState } from 'react';

interface UseExpandingTextareaResult {
	//
	textareaRef: React.RefObject<HTMLTextAreaElement>;
	value: string;
	isEmpty: boolean;
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	setValue: React.Dispatch<React.SetStateAction<string>>;
	adjustHeight: () => void;
}

export function useExpandingTextarea(initialValue = '', maxHeight = 240): UseExpandingTextareaResult {
	//
	const [value, setValue] = useState(initialValue);
	const [isEmpty, setIsEmpty] = useState(!initialValue.trim());
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const adjustHeight = useCallback(() => {
		//
		if (!textareaRef.current) return;

		textareaRef.current.style.height = 'auto';
		textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
		//
	}, [maxHeight]);

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

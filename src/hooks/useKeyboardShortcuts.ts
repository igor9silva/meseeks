import { RefObject, useCallback, useEffect } from 'react';

type KeyCombination = {
	//
	key: string;
	/** If true, Cmd key (Mac) or Ctrl key (Windows/Linux) must be pressed */
	withCommand?: boolean;
	/** If true, Alt key must be pressed */
	withAlt?: boolean;
	/** If true, Shift key must be pressed */
	withShift?: boolean;
};

interface UseKeyboardShortcutProps {
	//
	/** Key combination that triggers the shortcut */
	combo: KeyCombination;
	/** Function to call when the shortcut is triggered */
	callback: (e: KeyboardEvent) => void;
	/** If provided, shortcut will only work when this element is focused */
	targetRef?: RefObject<HTMLElement>;
	/** If true, shortcut will work even if the target is not focused */
	global?: boolean;
	/** If true, the default event behavior will not be prevented */
	skipPreventDefault?: boolean;
}

/**
 * Hook to register a keyboard shortcut
 *
 * @example
 * ```tsx
 * // Register a global shortcut
 * useKeyboardShortcut({
 *   combo: { key: 'i', withCommand: true },
 *   callback: () => textareaRef.current?.focus(),
 *   global: true
 * });
 *
 * // Register a shortcut that only works when an element is focused
 * useKeyboardShortcut({
 *   combo: { key: 'Enter', withCommand: true },
 *   callback: handleSubmit,
 *   targetRef: textareaRef
 * });
 * ```
 */
export function useKeyboardShortcut({
	combo,
	callback,
	targetRef,
	global = false,
	skipPreventDefault = false,
}: UseKeyboardShortcutProps) {
	//
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			//
			// Check if shortcut should be applied based on focus
			if (targetRef && !global) {
				const activeElement = document.activeElement;
				if (activeElement !== targetRef.current) return;
			}

			// Check if the key combination matches
			const commandKeyPressed = e.metaKey || e.ctrlKey;
			const altKeyPressed = e.altKey;
			const shiftKeyPressed = e.shiftKey;

			if (
				e.key === combo.key &&
				(!combo.withCommand || commandKeyPressed) &&
				(!combo.withAlt || altKeyPressed) &&
				(!combo.withShift || shiftKeyPressed)
			) {
				if (!skipPreventDefault) e.preventDefault();
				callback(e);
			}
		},
		[combo, callback, targetRef, global, skipPreventDefault],
	);

	// Register keyboard shortcut
	useEffect(() => {
		//
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
		//
	}, [handleKeyDown]);
}

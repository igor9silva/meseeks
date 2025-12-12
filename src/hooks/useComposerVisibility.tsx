import * as React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface ComposerVisibilityContextType {
	//
	isComposerVisible: boolean;
	focusComposer: () => void;
	registerComposer: (ref: React.RefObject<HTMLTextAreaElement>) => void;
	unregisterComposer: () => void;
}

const ComposerVisibilityContext = createContext<ComposerVisibilityContextType | null>(null);

export function useComposerVisibility() {
	//
	const context = useContext(ComposerVisibilityContext);

	if (!context) {
		throw new Error('useComposerVisibility must be used within ComposerVisibilityProvider');
	}

	return context;
}

export function ComposerVisibilityProvider({ children }: { children: React.ReactNode }) {
	//
	const [composerRef, setComposerRef] = useState<React.RefObject<HTMLTextAreaElement> | null>(null);

	const registerComposer = useCallback((ref: React.RefObject<HTMLTextAreaElement>) => {
		setComposerRef(ref);
	}, []);

	const unregisterComposer = useCallback(() => {
		setComposerRef(null);
	}, []);

	const focusComposer = useCallback(() => {
		//
		if (composerRef?.current) {
			composerRef.current.focus();
			const length = composerRef.current.value.length;
			composerRef.current.setSelectionRange(length, length);
		}
	}, [composerRef]);

	const value = useMemo(
		() => ({
			isComposerVisible: composerRef !== null,
			focusComposer,
			registerComposer,
			unregisterComposer,
		}),
		[composerRef, focusComposer, registerComposer, unregisterComposer],
	);

	return <ComposerVisibilityContext.Provider value={value}>{children}</ComposerVisibilityContext.Provider>;
}

/**
 * hook to register a composer with the visibility context
 * should be called in ActionComposer components
 */
export function useRegisterComposer(textareaRef: React.RefObject<HTMLTextAreaElement>) {
	//
	const { registerComposer, unregisterComposer } = useComposerVisibility();

	useEffect(() => {
		registerComposer(textareaRef);
		return () => unregisterComposer();
	}, [textareaRef, registerComposer, unregisterComposer]);
}

import {
	createContext,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from 'react';

type ComposerRegistration = {
	focus: () => boolean;
	isVisible: () => boolean;
};

type ComposerFocusContextType = {
	registerComposer: (registration: ComposerRegistration) => () => void;
	focusVisibleComposer: () => boolean;
};

const ComposerFocusContext = createContext<ComposerFocusContextType | null>(null);

export function ComposerFocusProvider({ children }: { children: ReactNode }) {
	//
	const composersRef = useRef<ComposerRegistration[]>([]);

	const registerComposer = useCallback((registration: ComposerRegistration) => {
		//
		composersRef.current = composersRef.current.concat(registration);

		return () => {
			composersRef.current = composersRef.current.filter((composer) => composer !== registration);
		};
	}, []);

	const focusVisibleComposer = useCallback(() => {
		//
		const visibleComposer = composersRef.current.find((composer) => composer.isVisible());

		if (!visibleComposer) return false;

		return visibleComposer.focus();
	}, []);

	const value = useMemo(
		() => ({
			registerComposer,
			focusVisibleComposer,
		}),
		[registerComposer, focusVisibleComposer],
	);

	return <ComposerFocusContext.Provider value={value}>{children}</ComposerFocusContext.Provider>;
}

export function useComposerFocusRegistry() {
	//
	const context = useContext(ComposerFocusContext);

	if (!context) {
		throw new Error('useComposerFocusRegistry must be used within ComposerFocusProvider');
	}

	return context;
}

export function useRegisterComposerFocus({
	textareaRef,
	isVisible = true,
}: {
	textareaRef: RefObject<HTMLTextAreaElement | HTMLTextAreaElement>;
	isVisible?: boolean;
}) {
	//
	const { registerComposer } = useComposerFocusRegistry();
	const visibilityRef = useRef(Boolean(isVisible));

	useEffect(() => {
		visibilityRef.current = Boolean(isVisible);
	}, [isVisible]);

	useEffect(() => {
		//
		const registration: ComposerRegistration = {
			isVisible: () => visibilityRef.current,
			focus: () => {
				//
				const textarea = 'current' in textareaRef ? textareaRef.current : textareaRef;
				if (!textarea) return false;

				textarea.focus();

				const length = textarea.value?.length ?? 0;
				textarea.setSelectionRange(length, length);

				return true;
			},
		};

		return registerComposer(registration);
	}, [registerComposer, textareaRef]);
}

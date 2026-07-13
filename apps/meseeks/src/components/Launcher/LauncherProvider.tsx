import { createContext, type ReactNode, startTransition, useContext, useMemo, useState } from 'react';
import { useKeyboardShortcut } from '@pro/ui/hooks/useKeyboardShortcuts';

interface LauncherContextType {
	isOpen: boolean;
	open: () => void;
	close: () => void;
}

const LauncherContext = createContext<LauncherContextType | null>(null);

export function useLauncher() {
	//
	const context = useContext(LauncherContext);

	if (!context) {
		throw new Error('useLauncher must be used within LauncherProvider');
	}

	return context;
}

export function LauncherProvider({ children }: { children: ReactNode }) {
	//
	const [isOpen, setIsOpen] = useState(false);

	const value = useMemo(
		() => ({
			isOpen,
			open: () => setIsOpen(true),
			close: () => setIsOpen(false),
		}),
		[isOpen],
	);

	// command menu toggle shortcut (⌘+K)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'k' },
		callback: () => {
			// use startTransition to mark this as non-urgent and prevent blocking
			startTransition(() => {
				setIsOpen((open) => !open);
			});
		},
	});

	return <LauncherContext.Provider value={value}>{children}</LauncherContext.Provider>;
}

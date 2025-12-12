import { Doc, Id } from 'convex/_generated/dataModel';
import * as React from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type LauncherMode = 'search' | 'composer';

export interface LauncherContext {
	//
	taskId?: Id<'tasks'>;
	task?: Doc<'tasks'>;
}

interface LauncherState {
	//
	isOpen: boolean;
	mode: LauncherMode;
	context: LauncherContext;
}

interface LauncherContextType extends LauncherState {
	//
	open: () => void;
	openSearch: () => void;
	openComposer: (context?: LauncherContext) => void;
	close: () => void;
	setMode: (mode: LauncherMode) => void;
	setContext: (context: LauncherContext) => void;
}

const LauncherReactContext = createContext<LauncherContextType | null>(null);

export function useLauncher() {
	//
	const context = useContext(LauncherReactContext);

	if (!context) {
		throw new Error('useLauncher must be used within LauncherProvider');
	}

	return context;
}

export function LauncherProvider({ children }: { children: React.ReactNode }) {
	//
	const [state, setState] = useState<LauncherState>({
		isOpen: false,
		mode: 'search',
		context: {},
	});

	const open = useCallback(() => {
		setState((prev) => ({ ...prev, isOpen: true }));
	}, []);

	const openSearch = useCallback(() => {
		setState((prev) => ({ ...prev, isOpen: true, mode: 'search' }));
	}, []);

	const openComposer = useCallback((context: LauncherContext = {}) => {
		setState((prev) => ({ ...prev, isOpen: true, mode: 'composer', context }));
	}, []);

	const close = useCallback(() => {
		setState((prev) => ({ ...prev, isOpen: false, mode: 'search', context: {} }));
	}, []);

	const setMode = useCallback((mode: LauncherMode) => {
		setState((prev) => ({ ...prev, mode }));
	}, []);

	const setContext = useCallback((context: LauncherContext) => {
		setState((prev) => ({ ...prev, context }));
	}, []);

	const value = useMemo(
		() => ({
			...state,
			open,
			openSearch,
			openComposer,
			close,
			setMode,
			setContext,
		}),
		[state, open, openSearch, openComposer, close, setMode, setContext],
	);

	return <LauncherReactContext.Provider value={value}>{children}</LauncherReactContext.Provider>;
}

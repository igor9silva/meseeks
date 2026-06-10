import { useLocation } from '@tanstack/react-router';
import { zid } from 'convex-helpers/server/zod3';
import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { Id } from 'convex/_generated/dataModel';
import { useFile } from '~/hooks/query/useFile';

const CurrentFileIdContext = createContext<Id<'files'> | undefined>(undefined);

export function useCurrentFile() {
	//
	const fileId = useCurrentFileId();
	if (!fileId) throw new Error('Could not determine current file.');

	return useFile(fileId);
}

export function useCurrentFileId() {
	//
	const contextFileId = useContext(CurrentFileIdContext);
	if (contextFileId) return contextFileId;

	const { pathname } = useLocation();
	const parts = pathname.split('/').filter(Boolean);
	const parsed = parts.at(0) === 'tasks' ? zid('files').safeParse(parts.at(1)) : undefined;
	return parsed?.success ? parsed.data : undefined;
}

export function CurrentFileIdProvider({ fileId, children }: { fileId: Id<'files'>; children: ReactNode }) {
	//
	return createElement(CurrentFileIdContext.Provider, { value: fileId }, children);
}

import { useDebouncer } from '@reactor/ui/hooks/pacer';
import type { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useRef } from 'react';

const SAVE_DEBOUNCE_MS = 500;

type QueueItem = { skillKey: string; args: Record<string, unknown> };

type DraftState = {
	queue: QueueItem[];
	message: string;
};

type UseDraftSyncOptions = {
	fileId: Id<'files'>;
	getLocalState: () => DraftState;
	onServerDraftReceived: (draft: DraftState) => void;
	isSaveBlocked?: boolean;
};

type UseDraftSyncReturn = {
	// triggers debounced save to server
	save: (queue: QueueItem[], message: string) => void;
	// immediately clears draft on server
	clear: () => void;
	// cancels pending debounced save
	cancel: () => void;
	// true if there's a pending save
	hasPendingSave: boolean;
};

export function useDraftSync({
	fileId,
	getLocalState,
	onServerDraftReceived,
	isSaveBlocked = false,
}: UseDraftSyncOptions): UseDraftSyncReturn {
	//
	const serverDraft = useQuery(api.drafts.findOne, { fileId });
	const saveDraftMutation = useMutation(api.drafts.save);
	const clearDraftMutation = useMutation(api.drafts.clear);

	const lastFileIdRef = useRef(fileId);
	const hasPendingSaveRef = useRef(false);
	const hasReceivedInitialDraftRef = useRef(false);
	const hasLoadedServerDraftRef = useRef(false);

	// stable refs for callbacks
	const getLocalStateRef = useRef(getLocalState);
	getLocalStateRef.current = getLocalState;

	const onServerDraftReceivedRef = useRef(onServerDraftReceived);
	onServerDraftReceivedRef.current = onServerDraftReceived;

	const isSaveBlockedRef = useRef(isSaveBlocked);
	isSaveBlockedRef.current = isSaveBlocked;

	// debounced save
	const saveDebouncer = useDebouncer(
		(fileIdToSave: Id<'files'>, queue: QueueItem[], msg: string) => {
			//
			const isEmpty = queue.length === 0 && !msg.trim();

			if (isEmpty) {
				clearDraftMutation({ fileId: fileIdToSave });
			} else {
				saveDraftMutation({ fileId: fileIdToSave, queue, message: msg });
			}

			hasPendingSaveRef.current = false;
			//
		},
		{ wait: SAVE_DEBOUNCE_MS },
		(state) => state.isPending,
	);

	const cancelPendingSave = saveDebouncer.cancel;
	const queueSave = saveDebouncer.maybeExecute;

	// handle file change: reset state
	useEffect(() => {
		//
		if (fileId !== lastFileIdRef.current) {
			cancelPendingSave();
			hasPendingSaveRef.current = false;
			hasReceivedInitialDraftRef.current = false;
			lastFileIdRef.current = fileId;
			hasLoadedServerDraftRef.current = false;
		}
	}, [fileId, cancelPendingSave]);

	// handle initial server draft load
	useEffect(() => {
		//
		if (serverDraft === undefined) return;

		if (!hasLoadedServerDraftRef.current) {
			hasLoadedServerDraftRef.current = true;
		}

		if (!serverDraft) {
			//
			if (hasPendingSaveRef.current && !isSaveBlockedRef.current) {
				const { queue, message } = getLocalStateRef.current();
				queueSave(fileId, queue, message);
			}
			return;
		}

		if (hasReceivedInitialDraftRef.current) return;

		hasReceivedInitialDraftRef.current = true;
		onServerDraftReceivedRef.current({
			queue: serverDraft.queue,
			message: serverDraft.message,
		});
	}, [serverDraft, fileId, queueSave]);

	// save on unmount
	useEffect(() => {
		//
		return () => {
			if (!hasPendingSaveRef.current) return;
			if (isSaveBlockedRef.current) return;
			if (!hasLoadedServerDraftRef.current) return;

			cancelPendingSave();
			const { queue, message } = getLocalStateRef.current();
			const isEmpty = queue.length === 0 && !message.trim();

			if (isEmpty) {
				clearDraftMutation({ fileId });
			} else {
				saveDraftMutation({ fileId, queue, message });
			}
		};
	}, [fileId, cancelPendingSave, clearDraftMutation, saveDraftMutation]);

	// prompt before unload
	useEffect(() => {
		//
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!hasPendingSaveRef.current) return;
			event.preventDefault();
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, []);

	const save = useCallback(
		(queue: QueueItem[], message: string) => {
			//
			hasPendingSaveRef.current = true;

			if (!hasLoadedServerDraftRef.current) return;
			if (isSaveBlockedRef.current) return;

			queueSave(fileId, queue, message);
		},
		[fileId, queueSave],
	);

	const clear = useCallback(() => {
		//
		cancelPendingSave();
		hasPendingSaveRef.current = false;
		clearDraftMutation({ fileId });
	}, [fileId, cancelPendingSave, clearDraftMutation]);

	const cancel = useCallback(() => {
		//
		cancelPendingSave();
		hasPendingSaveRef.current = false;
	}, [cancelPendingSave]);

	return {
		save,
		clear,
		cancel,
		hasPendingSave: hasPendingSaveRef.current || saveDebouncer.state,
	};
}

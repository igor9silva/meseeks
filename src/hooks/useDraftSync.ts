import type { Id } from 'convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { api } from 'convex/_generated/api';

const SAVE_DEBOUNCE_MS = 500;

type QueueItem = { skillKey: string; args: Record<string, unknown> };

type DraftState = {
	queue: QueueItem[];
	message: string;
};

type UseDraftSyncOptions = {
	taskId: Id<'tasks'>;
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
	taskId,
	getLocalState,
	onServerDraftReceived,
	isSaveBlocked = false,
}: UseDraftSyncOptions): UseDraftSyncReturn {
	//
	const serverDraft = useQuery(api.drafts.findOne, { taskId });
	const saveDraftMutation = useMutation(api.drafts.save);
	const clearDraftMutation = useMutation(api.drafts.clear);

	const lastTaskIdRef = useRef(taskId);
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
	const saveDebouncer = useDebounce((taskIdToSave: Id<'tasks'>, queue: QueueItem[], msg: string) => {
		//
		const isEmpty = queue.length === 0 && !msg.trim();

		if (isEmpty) {
			clearDraftMutation({ taskId: taskIdToSave });
		} else {
			saveDraftMutation({ taskId: taskIdToSave, queue, message: msg });
		}

		hasPendingSaveRef.current = false;
		//
	}, SAVE_DEBOUNCE_MS);

	// handle task change: reset state
	useEffect(() => {
		//
		if (taskId !== lastTaskIdRef.current) {
			saveDebouncer.cancel();
			hasPendingSaveRef.current = false;
			hasReceivedInitialDraftRef.current = false;
			lastTaskIdRef.current = taskId;
			hasLoadedServerDraftRef.current = false;
		}
	}, [taskId, saveDebouncer]);

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
				saveDebouncer.call(taskId, queue, message);
			}
			return;
		}

		if (hasReceivedInitialDraftRef.current) return;

		hasReceivedInitialDraftRef.current = true;
		onServerDraftReceivedRef.current({
			queue: serverDraft.queue,
			message: serverDraft.message,
		});
	}, [serverDraft]);

	// save on unmount
	useEffect(() => {
		//
		return () => {
			if (!hasPendingSaveRef.current) return;
			if (isSaveBlockedRef.current) return;
			if (!hasLoadedServerDraftRef.current) return;

			saveDebouncer.cancel();
			const { queue, message } = getLocalStateRef.current();
			const isEmpty = queue.length === 0 && !message.trim();

			if (isEmpty) {
				clearDraftMutation({ taskId });
			} else {
				saveDraftMutation({ taskId, queue, message });
			}
		};
	}, [taskId, saveDebouncer, clearDraftMutation, saveDraftMutation]);

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

			saveDebouncer.call(taskId, queue, message);
		},
		[taskId, saveDebouncer],
	);

	const clear = useCallback(() => {
		//
		saveDebouncer.cancel();
		hasPendingSaveRef.current = false;
		clearDraftMutation({ taskId });
	}, [taskId, saveDebouncer, clearDraftMutation]);

	const cancel = useCallback(() => {
		//
		saveDebouncer.cancel();
		hasPendingSaveRef.current = false;
	}, [saveDebouncer]);

	return {
		save,
		clear,
		cancel,
		hasPendingSave: hasPendingSaveRef.current,
	};
}

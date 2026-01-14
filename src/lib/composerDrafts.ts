import type { Id } from 'convex/_generated/dataModel';

// draft structure - designed for easy server-side migration later
// TODO: medium-term: persist server-side per task (like Slack drafts)
// TODO: medium-term: + "Drafts" list view
export type ComposerDraft = {
	queue: Array<{ skillKey: string; args: Record<string, unknown> }>;
	message: string;
};

const STORAGE_PREFIX = 'composer-draft:';

function getKey(taskId: Id<'tasks'>): string {
	//
	return `${STORAGE_PREFIX}${taskId}`;
}

export function loadDraft(taskId: Id<'tasks'>): ComposerDraft | null {
	//
	try {
		const raw = localStorage.getItem(getKey(taskId));
		if (!raw) return null;
		return JSON.parse(raw) as ComposerDraft;
	} catch {
		return null;
	}
}

export function saveDraft(taskId: Id<'tasks'>, draft: ComposerDraft): void {
	//
	const isEmpty = draft.queue.length === 0 && !draft.message.trim();

	if (isEmpty) {
		clearDraft(taskId);
		return;
	}

	try {
		localStorage.setItem(getKey(taskId), JSON.stringify(draft));
	} catch {
		// localStorage full or disabled - silent fail
	}
}

export function clearDraft(taskId: Id<'tasks'>): void {
	//
	try {
		localStorage.removeItem(getKey(taskId));
	} catch {
		// silent fail
	}
}

// for future "Drafts" list view
export function listDraftTaskIds(): Id<'tasks'>[] {
	//
	const ids: Id<'tasks'>[] = [];

	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith(STORAGE_PREFIX)) {
				ids.push(key.slice(STORAGE_PREFIX.length) as Id<'tasks'>);
			}
		}
	} catch {
		// silent fail
	}

	return ids;
}

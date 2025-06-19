import { Doc } from 'convex/_generated/dataModel';
import { useEffect, useRef, useState } from 'react';
import { useWebNotifications } from './useWebNotifications';

/**
 * Hook that monitors task status changes and shows notifications
 * when tasks become "unread" or "blocked"
 */
export function useTaskNotifications(task: Doc<'tasks'>) {
	//
	const { showTaskNotification, permission } = useWebNotifications();
	const previousStatusRef = useRef<string | null>(null);
	const [isEnabled, setIsEnabled] = useState(() => {
		//
		if (typeof window === 'undefined') return false;
		return localStorage.getItem('notifications-enabled') === 'true';
	});

	// listen for localStorage changes to update enabled state
	useEffect(() => {
		//
		const handleStorageChange = () => {
			setIsEnabled(localStorage.getItem('notifications-enabled') === 'true');
		};

		window.addEventListener('storage', handleStorageChange);

		// also check periodically in case localStorage is changed in the same tab
		const checkInterval = setInterval(handleStorageChange, 1000);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			clearInterval(checkInterval);
		};
	}, []);

	useEffect(() => {
		//
		const currentStatus = task.status;
		const previousStatus = previousStatusRef.current;

		// update the previous status ref
		previousStatusRef.current = currentStatus;

		// skip on first render (no previous status to compare)
		if (previousStatus === null) {
			return;
		}

		// skip if permission not granted or notifications disabled
		if (permission !== 'granted' || !isEnabled) {
			return;
		}

		// only notify when transitioning TO unread or blocked from another status
		const shouldNotify =
			(currentStatus === 'unread' || currentStatus === 'blocked') && currentStatus !== previousStatus;

		if (shouldNotify) {
			console.debug(`Task ${task._id} status changed: ${previousStatus} -> ${currentStatus}`);

			const statusEmoji = currentStatus === 'unread' ? '💬' : '🚫';
			const statusText = currentStatus === 'unread' ? 'new update' : 'needs attention';
			showTaskNotification(`${statusEmoji} ${task.title || 'Untitled task'}`, {
				body: `Your task has a ${statusText}`,
				tag: task._id,
				requireInteraction: currentStatus === 'blocked',
				data: { taskId: task._id, url: `/tasks/${task._id}` },
			});
		}
	}, [task.status, task.title, task._id, showTaskNotification, permission, isEnabled]);
}

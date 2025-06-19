import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { useEffect, useRef, useState } from 'react';
import { useWebNotifications } from '~/hooks/useWebNotifications';

/**
 * Component that monitors all user tasks for status changes and triggers notifications
 * Should be mounted at the app level to work globally
 */
export function GlobalTaskNotifications() {
	//
	const { showTaskNotification, permission } = useWebNotifications();
	const inboxQuery = convexQuery(api.tasks.public.findAll, {});
	const { data: tasks } = useSuspenseQuery(inboxQuery);

	// track previous task statuses
	const previousTaskStatusesRef = useRef<Record<string, string>>({});

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
		// skip if permission not granted or notifications disabled
		if (permission !== 'granted' || !isEnabled) {
			return;
		}

		const currentStatuses: Record<string, string> = {};
		const previousStatuses = previousTaskStatusesRef.current;

		// check each task for status changes
		for (const task of tasks) {
			const taskId = task._id;
			const currentStatus = task.status;
			const previousStatus = previousStatuses[taskId];

			// update current status tracking
			currentStatuses[taskId] = currentStatus;

			// skip on first load (no previous status to compare)
			if (previousStatus === undefined) {
				continue;
			}

			// only notify when transitioning TO unread or blocked from another status
			const shouldNotify =
				(currentStatus === 'unread' || currentStatus === 'blocked') && currentStatus !== previousStatus;

			if (shouldNotify) {
				console.debug(
					`Global notification: Task ${taskId} status changed: ${previousStatus} -> ${currentStatus}`,
				);

				const statusEmoji = currentStatus === 'unread' ? '💬' : '🚫';
				const statusText = currentStatus === 'unread' ? 'new update' : 'needs attention';
				showTaskNotification(`${statusEmoji} ${task.title || 'Untitled task'}`, {
					body: `Your task has a ${statusText}`,
					tag: taskId,
					requireInteraction: currentStatus === 'blocked',
					data: { taskId, url: `/tasks/${taskId}` },
				});
			}
		}

		// update the previous statuses ref
		previousTaskStatusesRef.current = currentStatuses;
	}, [tasks, showTaskNotification, permission, isEnabled]);

	// this component doesn't render anything
	return null;
}

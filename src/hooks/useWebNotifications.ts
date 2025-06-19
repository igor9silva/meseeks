import { api } from 'convex/_generated/api';
import { useMutation } from 'convex/react';
import { useCallback, useEffect, useState } from 'react';

type NotificationPermission = 'default' | 'granted' | 'denied';

/**
 * Hook for managing web push notifications with proper registration and permission handling
 *
 * @returns Object with notification functions and permission state
 */
export function useWebNotifications() {
	//
	// TODO: Enable once API is generated
	// const subscribeMutation = useMutation(api.webPushSubscriptions.public.subscribe);
	// const unsubscribeMutation = useMutation(api.webPushSubscriptions.public.unsubscribe);

	const [permission, setPermission] = useState<NotificationPermission>(() => {
		//
		if (typeof window === 'undefined' || !('Notification' in window)) {
			return 'denied';
		}

		return Notification.permission;
	});

	const [isSupported, setIsSupported] = useState(() => {
		//
		if (typeof window === 'undefined') return false;
		return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
	});

	const [isSubscribed, setIsSubscribed] = useState(false);

	const subscribeUser = useMutation(api.webPushSubscriptions.public.subscribe);
	const unsubscribeUser = useMutation(api.webPushSubscriptions.public.unsubscribe);

	/**
	 * Get the VAPID public key from environment - this should be exposed publicly
	 */
	const getVAPIDPublicKey = useCallback(() => {
		// TODO: This should come from your backend/environment variables
		// For now, return a placeholder - you'll need to set this up
		return process.env['NEXT_PUBLIC_VAPID_KEY'] || 'YOUR_VAPID_PUBLIC_KEY';
	}, []);

	/**
	 * Convert base64 string to Uint8Array for VAPID key
	 */
	const urlBase64ToUint8Array = useCallback((base64String: string) => {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	}, []);

	/**
	 * Register service worker and get push subscription
	 */
	const subscribeToPush = useCallback(async (): Promise<boolean> => {
		//
		if (!isSupported) {
			console.warn('Push notifications are not supported');
			return false;
		}

		try {
			// Request notification permission
			const permissionResult = await Notification.requestPermission();
			setPermission(permissionResult);

			if (permissionResult !== 'granted') {
				console.warn('Notification permission denied');
				return false;
			}

			// Register service worker
			const registration = await navigator.serviceWorker.ready;
			console.debug('Service Worker registered:', registration);

			// Get push subscription
			const vapidPublicKey = getVAPIDPublicKey();
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
			});

			// TODO: Save subscription to backend once API is generated
			console.debug('Would save subscription to backend:', {
				endpoint: subscription.endpoint,
				keys: {
					p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
					auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
				},
			});

			// Send subscription to server
			await subscribeUser({
				subscription: {
					endpoint: subscription.endpoint,
					keys: {
						p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
						auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
					},
				},
				userAgent: navigator.userAgent,
			});

			setIsSubscribed(true);
			console.info('Successfully subscribed to push notifications');
			return true;
		} catch (error) {
			console.error('Failed to subscribe to push notifications:', error);
			console.info('Failed to enable push notifications');
			return false;
		}
	}, [isSupported, getVAPIDPublicKey, urlBase64ToUint8Array, subscribeUser]);

	/**
	 * Unsubscribe from push notifications
	 */
	const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
		//
		if (!isSupported) {
			return false;
		}

		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();

			if (subscription) {
				await subscription.unsubscribe();
				await unsubscribeUser({
					endpoint: subscription.endpoint,
				});
			}

			setIsSubscribed(false);
			console.info('Successfully unsubscribed from push notifications');
			return true;
		} catch (error) {
			console.error('Failed to unsubscribe from push notifications:', error);
			console.info('Failed to disable push notifications');
			return false;
		}
	}, [isSupported, subscribeUser, unsubscribeUser]);

	/**
	 * Check if user is already subscribed to push notifications
	 */
	const checkSubscriptionStatus = useCallback(async () => {
		//
		if (!isSupported) {
			return;
		}

		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			setIsSubscribed(Boolean(subscription));
		} catch (error) {
			console.error('Failed to check subscription status:', error);
			setIsSubscribed(false);
		}
	}, [isSupported]);

	// Check subscription status on mount
	useEffect(() => {
		checkSubscriptionStatus();
	}, [checkSubscriptionStatus]);

	const showTaskNotification = useCallback(
		(title: string, options?: NotificationOptions) => {
			//
			if (!isSupported || permission !== 'granted') {
				return;
			}

			new Notification(title, {
				icon: '/static/logo-light-192.png',
				badge: '/static/logo-light-192.png',
				...options,
			});
		},
		[isSupported, permission],
	);

	// Test function for development
	const testNotification = useCallback(() => {
		//
		if (!isSupported) {
			console.warn('Notifications not supported');
			return;
		}

		if (permission !== 'granted') {
			console.warn('Notification permission not granted. Current permission:', permission);
			return;
		}

		// Test browser notification
		showTaskNotification('🧪 Test Notification', {
			body: 'This is a test notification from Meseeks!',
			tag: 'test-notification',
			requireInteraction: false,
			data: { test: true },
		});

		console.info('Test notification sent');
	}, [isSupported, permission, showTaskNotification]);

	return {
		isSupported,
		permission,
		isSubscribed,
		subscribeToPush,
		unsubscribeFromPush,
		checkSubscriptionStatus,
		showTaskNotification,
		testNotification,
	};
}

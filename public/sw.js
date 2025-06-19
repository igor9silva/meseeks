// Service Worker for handling push notifications

// Install event
self.addEventListener('install', (event) => {
	console.log('Service Worker installing');
	self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
	console.log('Service Worker activating');
	event.waitUntil(clients.claim());
});

// Push event - handles incoming push notifications
self.addEventListener('push', (event) => {
	console.log('Push event received:', event);

	if (!event.data) {
		console.warn('Push event has no data');
		return;
	}

	try {
		const data = event.data.json();
		console.log('Push notification data:', data);

		const options = {
			body: data.body,
			icon: data.icon || '/static/logo-light-192.png',
			badge: data.badge || '/static/logo-light-192.png',
			tag: data.tag || 'default',
			requireInteraction: data.requireInteraction || false,
			data: data.data || {},
			actions: [
				{
					action: 'open',
					title: 'Open',
					icon: '/static/logo-light-192.png'
				},
				{
					action: 'close',
					title: 'Dismiss'
				}
			]
		};

		event.waitUntil(
			self.registration.showNotification(data.title, options)
		);
	} catch (error) {
		console.error('Error processing push notification:', error);
		// Fallback notification
		event.waitUntil(
			self.registration.showNotification('New Notification', {
				body: 'You have a new notification',
				icon: '/static/logo-light-192.png'
			})
		);
	}
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
	console.log('Notification clicked:', event);

	event.notification.close();

	const data = event.notification.data || {};
	const url = data.url || '/';

	if (event.action === 'close') {
		// User clicked dismiss, do nothing
		return;
	}

	// Open or focus the app
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			// Check if there's already a window/tab open
			for (const client of clientList) {
				if (client.url.includes(url) && 'focus' in client) {
					return client.focus();
				}
			}

			// No existing window found, open a new one
			if (clients.openWindow) {
				return clients.openWindow(url);
			}
		})
	);
});

// Background sync (optional, for offline support)
self.addEventListener('sync', (event) => {
	console.log('Background sync:', event);
	// Handle background sync if needed
});

// Message handler for testing
self.addEventListener('message', (event) => {
	console.log('Service Worker received message:', event.data);
	
	if (event.data.type === 'TEST_MESSAGE') {
		console.log('Test message received:', event.data.data);
		
		// Send a test notification
		self.registration.showNotification('🧪 Service Worker Test', {
			body: 'Message received by Service Worker!',
			icon: '/static/logo-light-192.png',
			tag: 'sw-test',
			data: event.data.data
		});
	}
});

console.log('Service Worker loaded'); 
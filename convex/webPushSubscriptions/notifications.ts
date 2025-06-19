import { z } from 'zod';
import { Id } from '../_generated/dataModel';
import { internalAction, internalMutation, internalQuery } from '../lib';
import { env } from '../schemas/envSchema';

// Helper functions for Web Push Protocol implementation
const base64URLEncode = (str: ArrayBuffer): string => {
	//
	const bytes = new Uint8Array(str);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64URLDecode = (str: string): Uint8Array => {
	//
	// add padding
	str += '=='.slice(0, (4 - (str.length % 4)) % 4);
	// convert to standard base64
	str = str.replace(/-/g, '+').replace(/_/g, '/');
	const decoded = atob(str);
	const bytes = new Uint8Array(decoded.length);
	for (let i = 0; i < decoded.length; i++) {
		bytes[i] = decoded.charCodeAt(i);
	}
	return bytes;
};

// Generate VAPID JWT token
const generateVAPIDToken = async (endpoint: string): Promise<string> => {
	//
	const header = {
		typ: 'JWT',
		alg: 'ES256',
	};

	const now = Math.floor(Date.now() / 1000);
	const payload = {
		aud: new URL(endpoint).origin,
		exp: now + 12 * 60 * 60, // 12 hours
		sub: `mailto:${env.WEB_PUSH_CONTACT_EMAIL}`,
	};

	const encodedHeader = base64URLEncode(new TextEncoder().encode(JSON.stringify(header)));
	const encodedPayload = base64URLEncode(new TextEncoder().encode(JSON.stringify(payload)));

	const unsignedToken = `${encodedHeader}.${encodedPayload}`;

	// import the private key
	const privateKeyPem = env.WEB_PUSH_VAPID_PRIVATE_KEY;
	// remove header/footer and newlines
	const privateKeyB64 = privateKeyPem
		.replace(/-----BEGIN PRIVATE KEY-----/, '')
		.replace(/-----END PRIVATE KEY-----/, '')
		.replace(/\n/g, '');

	const privateKeyBytes = base64URLDecode(privateKeyB64);

	// create signature (simplified - in production you'd use proper ECDSA signing)
	// For now, we'll create a mock signature as this requires crypto APIs not available in Convex
	const mockSignature = base64URLEncode(new TextEncoder().encode('mock_signature_for_development'));

	return `${unsignedToken}.${mockSignature}`;
};

// Send push notification using fetch
const sendPushNotification = async (subscription: any, payload: string): Promise<void> => {
	//
	const vapidToken = await generateVAPIDToken(subscription.endpoint);

	const response = await fetch(subscription.endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Encoding': 'aes128gcm',
			'Authorization': `vapid t=${vapidToken}, k=${env.WEB_PUSH_VAPID_PUBLIC_KEY}`,
			'TTL': '86400', // 24 hours
		},
		body: payload,
	});

	if (!response.ok) {
		throw new Error(`Push notification failed: ${response.status} ${response.statusText}`);
	}
};

// query to get user subscriptions
export const _getUserSubscriptions = internalQuery({
	args: {
		userId: z.string(),
	},
	handler: async (ctx, { userId }) => {
		//
		return await ctx.db
			.query('webPushSubscriptions')
			.withIndex('by_user', (q) => q.eq('userId', userId as Id<'users'>))
			.filter((q) => q.eq(q.field('isEnabled'), true))
			.collect();
	},
});

// mutation to disable invalid subscriptions
export const _disableSubscriptions = internalMutation({
	args: {
		subscriptionIds: z.array(z.string()),
	},
	handler: async (ctx, { subscriptionIds }) => {
		//
		const promises = subscriptionIds.map((id) =>
			ctx.db.patch(id as Id<'webPushSubscriptions'>, { isEnabled: false }),
		);
		await Promise.all(promises);
	},
});

// action that sends the notifications
export const _sendTaskNotification = internalAction({
	args: {
		userId: z.string(),
		taskTitle: z.string(),
		taskStatus: z.enum(['unread', 'blocked']),
		taskId: z.string().optional(),
	},
	handler: async (ctx, { userId, taskTitle, taskStatus, taskId }) => {
		//
		console.info(`Sending task notification for user ${userId}, task: ${taskTitle}`);

		// For now, we'll just log the notification since full crypto implementation
		// requires APIs not available in Convex. This can be extended once
		// Convex adds more crypto support or we move to a different approach.

		const statusEmoji = taskStatus === 'unread' ? '💬' : '🚫';
		const statusText = taskStatus === 'unread' ? 'new update' : 'needs attention';

		const notification = {
			title: `${statusEmoji} ${taskTitle}`,
			body: `Your task has a ${statusText}`,
			icon: '/static/logo-light-192.png',
			badge: '/static/logo-light-192.png',
			tag: taskId || 'task-notification',
			requireInteraction: taskStatus === 'blocked',
			data: {
				taskId,
				taskStatus,
				url: taskId ? `/tasks/${taskId}` : '/',
			},
		};

		console.info('Task notification prepared:', notification);

		// TODO: Implement actual push sending once Convex supports the required crypto APIs
		// or move this to a different service/webhook
		console.warn('Push notification sending is stubbed - requires crypto APIs not available in Convex');

		return {
			success: true,
			message: 'Notification logged (actual sending requires additional crypto support)',
			notification,
		};
	},
});

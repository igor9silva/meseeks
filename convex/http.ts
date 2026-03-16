import { httpRouter } from 'convex/server';
import { betterAuthComponent } from './betterAuth/component';
import { createBetterAuth } from './betterAuth/runtime.private';
import { handlePolarWebhook } from 'lib/polar';

const http = httpRouter();

betterAuthComponent.registerRoutes(http, createBetterAuth);

http.route({
	path: '/polar/webhook',
	method: 'POST',
	handler: handlePolarWebhook,
});

export default http;

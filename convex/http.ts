import { httpRouter } from 'convex/server';
import { auth } from './auth';
import { handlePolarWebhook } from './lib/polar';

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
	path: '/polar/webhook',
	method: 'POST',
	handler: handlePolarWebhook,
});

export default http;

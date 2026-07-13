import { httpRouter } from 'convex/server';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { betterAuthComponent } from './betterAuth/component';
import { createBetterAuth } from './betterAuth/runtime.private';
import { handlePolarWebhook } from 'lib/polar';
import { endpointPathPrefix, endpointSecretHeader } from 'lib/endpoints';

const http = httpRouter();

betterAuthComponent.registerRoutes(http, createBetterAuth);

const handleProEndpoint = httpAction(async (ctx, request) => {
	//
	const url = new URL(request.url);
	const slug = url.pathname.slice(endpointPathPrefix.length);
	const secret = request.headers.get(endpointSecretHeader) ?? url.searchParams.get('secret') ?? '';
	const query: Record<string, string> = {};
	const headers: Record<string, string> = {};

	url.searchParams.forEach((value, key) => {
		if (isSensitiveEndpointQueryParam(key)) return;
		query[key] = value;
	});
	request.headers.forEach((value, key) => {
		if (isSensitiveEndpointHeader(key)) return;
		headers[key] = value;
	});

	if (!slug || !secret) return genericEndpointResponse();

	const received = await ctx.runMutation(internal.endpoints._receive, {
		slug,
		secret,
		request: {
			method: request.method,
			path: url.pathname,
			headers,
			query,
			body: await request.text(),
		},
	});
	if (received) {
		await ctx.runAction(internal.triggerIsolate._evaluateEndpoint, {
			owner: received.owner,
			file: received.file,
			triggerId: received.triggerId,
			request: received.request,
		});
	}

	return genericEndpointResponse();
});

http.route({
	path: '/polar/webhook',
	method: 'POST',
	handler: handlePolarWebhook,
});

http.route({
	pathPrefix: endpointPathPrefix,
	method: 'GET',
	handler: handleProEndpoint,
});

http.route({
	pathPrefix: endpointPathPrefix,
	method: 'POST',
	handler: handleProEndpoint,
});

export default http;

function genericEndpointResponse() {
	return new Response(null, { status: 202 });
}

function isSensitiveEndpointQueryParam(key: string) {
	//
	return key.toLowerCase() === 'secret';
}

function isSensitiveEndpointHeader(key: string) {
	//
	const lower = key.toLowerCase();
	if (lower === endpointSecretHeader) return true;
	if (lower === 'authorization') return true;
	if (lower === 'proxy-authorization') return true;
	if (lower === 'cookie') return true;
	if (lower === 'set-cookie') return true;
	if (lower === 'cf-connecting-ip') return true;
	if (lower === 'x-forwarded-for') return true;
	if (lower === 'x-real-ip') return true;
	if (lower === 'forwarded') return true;

	return false;
}

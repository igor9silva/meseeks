#!/usr/bin/env bun
// discovers the ticktick inbox ID by creating a temporary task
// usage: bun discover-inbox.ts

const BASE_URL = 'https://api.ticktick.com/open/v1';

const API_TOKEN = requireEnv('TICKTICK_API_TOKEN');

function requireEnv(name: string): string {
	//
	const value = process.env[name];
	if (!value) {
		console.error(`Missing required env var: ${name}`);
		process.exit(1);
	}
	return value;
}

async function discoverInboxId(): Promise<string | null> {
	//
	console.log('Creating a temporary task to discover Inbox ID...');

	const createResponse = await fetch(`${BASE_URL}/task`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${API_TOKEN}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ title: '__TEMP_INBOX_DISCOVERY__' }),
	});

	if (!createResponse.ok) {
		console.error(`Failed to create task: ${createResponse.status} ${createResponse.statusText}`);
		const text = await createResponse.text();
		console.error(text);
		return null;
	}

	const task = (await createResponse.json()) as { id: string; projectId: string; title: string };
	const inboxId = task.projectId;

	console.log(`\nDiscovered Inbox ID: ${inboxId}`);
	console.log(`Task created: "${task.title}" (id: ${task.id})`);

	console.log('\nDeleting temporary task...');
	const deleteResponse = await fetch(`${BASE_URL}/project/${inboxId}/task/${task.id}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${API_TOKEN}` },
	});

	if (deleteResponse.ok) {
		console.log('Temporary task deleted');
	} else {
		console.warn(`Could not delete temporary task: ${deleteResponse.status}`);
		console.warn('You may need to delete it manually from your Inbox');
	}

	console.log('\nSet this environment variable:');
	console.log(`  export TICKTICK_INBOX_ID="${inboxId}"`);

	return inboxId;
}

discoverInboxId().catch(console.error);

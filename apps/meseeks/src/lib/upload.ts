import { z } from 'zod/v3';
import type { Id } from 'convex/_generated/dataModel';

type ActionRequest = {
	root: Id<'files'>;
	skill: string;
	input: Record<string, unknown>;
};

type UploadProgressState = 'hashing' | 'preparing' | 'uploading' | 'committing' | 'done' | 'failed';

export type UploadProgress = {
	state: UploadProgressState;
	file: string;
	loaded?: number;
	total?: number;
};

type UploadArgs = {
	file: File;
	rootId: Id<'files'>;
	parentId?: Id<'files'>;
	act(actions: Array<ActionRequest>): Promise<Array<Id<'actions'>>>;
	findAction(action: Id<'actions'>): Promise<unknown>;
	findDetails(action: Id<'actions'>): Promise<unknown>;
	onProgress?: (progress: UploadProgress) => void;
};

const actionStatusSchema = z.object({
	status: z.string(),
	warnings: z.array(z.string()).optional(),
});

const uploadTicketSchema = z.object({
	kind: z.literal('upload'),
	ticketAction: z.string().min(1),
	parent: z.string().min(1),
	name: z.string().min(1),
	contentType: z.string().min(1),
	size: z.number().int().min(0),
	hash: z.string().min(1),
	checksum: z.string().min(1),
	stagedStorageKey: z.string().min(1),
	uploadUrl: z.string().url(),
	expiresAt: z.number(),
});

export async function upload({
	file,
	rootId,
	parentId = rootId,
	act,
	findAction,
	findDetails,
	onProgress,
}: UploadArgs) {
	//
	onProgress?.({ state: 'hashing', file: file.name, total: file.size });
	const digest = await digestFile(file);
	const contentType = file.type || 'application/octet-stream';

	onProgress?.({ state: 'preparing', file: file.name, total: file.size });
	const prepareActions = await act([
		{
			root: rootId,
			skill: 'prepareUpload',
			input: {
				parentId,
				name: file.name,
				contentType,
				size: file.size,
				hash: digest.hash,
				checksum: digest.checksum,
			},
		},
	]);
	const prepareAction = firstAction(prepareActions);
	await waitForSucceededAction({
		action: prepareAction,
		findAction,
	});
	const ticket = await waitForUploadTicket({
		action: prepareAction,
		findDetails,
	});

	onProgress?.({ state: 'uploading', file: file.name, loaded: 0, total: file.size });
	await putFile({
		file,
		ticket,
		onProgress,
	});

	onProgress?.({ state: 'committing', file: file.name, total: file.size });
	const commitActions = await act([
		{
			root: rootId,
			skill: 'commitUpload',
			input: {
				ticketActionId: prepareAction,
			},
		},
	]);
	const commitAction = firstAction(commitActions);
	await waitForSucceededAction({
		action: commitAction,
		findAction,
	});
	onProgress?.({ state: 'done', file: file.name, loaded: file.size, total: file.size });

	return {
		prepareAction,
		commitAction,
	};
}

async function digestFile(file: File) {
	//
	const buffer = await file.arrayBuffer();
	const digest = await crypto.subtle.digest('SHA-256', buffer);
	const bytes = new Uint8Array(digest);
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return {
		checksum: btoa(binary),
		hash: Array.from(bytes)
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join(''),
	};
}

function firstAction(actions: Array<Id<'actions'>>) {
	//
	const action = actions[0];
	if (!action) throw new Error('Action API returned no action id.');

	return action;
}

async function waitForSucceededAction({
	action,
	findAction,
}: {
	action: Id<'actions'>;
	findAction(action: Id<'actions'>): Promise<unknown>;
}) {
	//
	for (let attempt = 0; attempt < 120; attempt += 1) {
		const row = actionStatusSchema.parse(await findAction(action));
		if (row.status === 'succeeded') return;
		if (row.status === 'failed' || row.status === 'skipped') {
			throw new Error(`Action ${row.status}: ${(row.warnings ?? []).join(', ') || 'no details'}`);
		}

		await sleep(500);
	}

	throw new Error('Timed out waiting for action to finish.');
}

async function waitForUploadTicket({
	action,
	findDetails,
}: {
	action: Id<'actions'>;
	findDetails(action: Id<'actions'>): Promise<unknown>;
}) {
	//
	for (let attempt = 0; attempt < 20; attempt += 1) {
		const details = z.array(z.unknown()).parse(await findDetails(action));

		for (const detail of details) {
			const ticket = uploadTicketSchema.safeParse(detail);
			if (ticket.success) return ticket.data;
		}

		await sleep(250);
	}

	throw new Error('Timed out waiting for upload ticket details.');
}

function putFile({
	file,
	ticket,
	onProgress,
}: {
	file: File;
	ticket: z.infer<typeof uploadTicketSchema>;
	onProgress?: (progress: UploadProgress) => void;
}) {
	//
	return new Promise<void>((resolve, reject) => {
		const request = new XMLHttpRequest();

		request.open('PUT', ticket.uploadUrl);
		request.setRequestHeader('Content-Type', ticket.contentType);
		request.setRequestHeader('x-amz-checksum-sha256', ticket.checksum);
		request.upload.onprogress = (event) => {
			//
			onProgress?.({
				state: 'uploading',
				file: file.name,
				loaded: event.loaded,
				total: event.lengthComputable ? event.total : file.size,
			});
		};
		request.onload = () => {
			//
			if (request.status >= 200 && request.status < 300) {
				resolve();
				return;
			}

			reject(new Error(`Object Storage upload failed with HTTP ${request.status}.`));
		};
		request.onerror = () => {
			//
			reject(new Error('Object Storage upload failed.'));
		};
		request.send(file);
	});
}

function sleep(ms: number) {
	//
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

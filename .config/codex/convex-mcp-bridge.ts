#!/usr/bin/env bun

import { spawn } from 'node:child_process';

interface StreamState {
	buffer: Buffer;
}

const CONTENT_LENGTH_HEADER = 'content-length:';

function parseServerCommand(argv: string[]): { command: string; args: string[] } | null {
	//
	const separatorIndex = argv.indexOf('--');
	const commandParts = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : argv.slice(2);
	const command = commandParts[0];

	if (!command) {
		return null;
	}

	return {
		command,
		args: commandParts.slice(1),
	};
}

function toBuffer(chunk: unknown): Buffer {
	//
	if (Buffer.isBuffer(chunk)) {
		return chunk;
	}

	if (chunk instanceof Uint8Array) {
		return Buffer.from(chunk);
	}

	if (typeof chunk === 'string') {
		return Buffer.from(chunk, 'utf8');
	}

	return Buffer.alloc(0);
}

function trimLeadingLineBreaks(state: StreamState): void {
	//
	while (state.buffer.length > 0) {
		//
		const firstByte = state.buffer[0];

		if (firstByte !== 10 && firstByte !== 13) {
			return;
		}

		state.buffer = state.buffer.subarray(1);
	}
}

function findHeaderTerminator(buffer: Buffer): { index: number; size: number } | null {
	//
	const raw = buffer.toString('utf8');
	const crlfIndex = raw.indexOf('\r\n\r\n');
	const lfIndex = raw.indexOf('\n\n');

	if (crlfIndex === -1 && lfIndex === -1) {
		return null;
	}

	if (crlfIndex !== -1 && (lfIndex === -1 || crlfIndex < lfIndex)) {
		return { index: crlfIndex, size: 4 };
	}

	return { index: lfIndex, size: 2 };
}

function readContentLength(headerBlock: string): number | null {
	//
	const headerLines = headerBlock.split(/\r?\n/);

	for (const line of headerLines) {
		//
		const normalizedLine = line.toLowerCase();

		if (!normalizedLine.startsWith(CONTENT_LENGTH_HEADER)) {
			continue;
		}

		const separatorIndex = line.indexOf(':');

		if (separatorIndex === -1) {
			return null;
		}

		const lengthText = line.slice(separatorIndex + 1).trim();
		const length = Number(lengthText);

		if (!Number.isInteger(length) || length < 0) {
			return null;
		}

		return length;
	}

	return null;
}

function consumeContentLengthFrame(state: StreamState, onMessage: (payload: string) => void): boolean {
	//
	const prefix = state.buffer.subarray(0, 64).toString('utf8').toLowerCase();

	if (!prefix.startsWith(CONTENT_LENGTH_HEADER)) {
		return false;
	}

	const terminator = findHeaderTerminator(state.buffer);

	if (!terminator) {
		return false;
	}

	const headerBlock = state.buffer.subarray(0, terminator.index).toString('utf8');
	const contentLength = readContentLength(headerBlock);
	const bodyStart = terminator.index + terminator.size;

	if (contentLength === null) {
		state.buffer = state.buffer.subarray(bodyStart);
		return true;
	}

	const bodyEnd = bodyStart + contentLength;

	if (state.buffer.length < bodyEnd) {
		return false;
	}

	const payload = state.buffer.subarray(bodyStart, bodyEnd).toString('utf8');
	state.buffer = state.buffer.subarray(bodyEnd);
	onMessage(payload);

	return true;
}

function consumeJsonLineFrame(state: StreamState, onMessage: (payload: string) => void): boolean {
	//
	const lineEnd = state.buffer.indexOf(10);

	if (lineEnd === -1) {
		return false;
	}

	const rawLine = state.buffer.subarray(0, lineEnd).toString('utf8').replace(/\r$/, '').trim();
	state.buffer = state.buffer.subarray(lineEnd + 1);

	if (rawLine.length === 0) {
		return true;
	}

	onMessage(rawLine);

	return true;
}

function consumeMessages(state: StreamState, chunk: Buffer, onMessage: (payload: string) => void): void {
	//
	state.buffer = Buffer.concat([state.buffer, chunk]);

	while (true) {
		//
		trimLeadingLineBreaks(state);

		if (consumeContentLengthFrame(state, onMessage)) {
			continue;
		}

		if (consumeJsonLineFrame(state, onMessage)) {
			continue;
		}

		return;
	}
}

function writeContentLengthMessage(payload: string): void {
	//
	const payloadBuffer = Buffer.from(payload, 'utf8');
	const header = `Content-Length: ${payloadBuffer.byteLength}\r\n\r\n`;

	process.stdout.write(header);
	process.stdout.write(payloadBuffer);
}

const serverCommand = parseServerCommand(process.argv);

if (!serverCommand) {
	console.error('usage: bun run .config/codex/convex-mcp-bridge.ts -- <command> [args...]');
	process.exit(1);
}

const child = spawn(serverCommand.command, serverCommand.args, {
	stdio: ['pipe', 'pipe', 'inherit'],
	env: process.env,
});

if (!child.stdin || !child.stdout) {
	console.error('failed to initialize convex mcp bridge stdio streams');
	process.exit(1);
}

const clientInputState: StreamState = { buffer: Buffer.alloc(0) };
const serverOutputState: StreamState = { buffer: Buffer.alloc(0) };

process.stdin.on('data', (chunk: unknown) => {
	//
	const chunkBuffer = toBuffer(chunk);

	if (chunkBuffer.length === 0) {
		return;
	}

	consumeMessages(clientInputState, chunkBuffer, (payload) => {
		child.stdin?.write(`${payload}\n`);
	});
});

process.stdin.on('end', () => {
	//
	child.stdin?.end();
});

child.stdout.on('data', (chunk: unknown) => {
	//
	const chunkBuffer = toBuffer(chunk);

	if (chunkBuffer.length === 0) {
		return;
	}

	consumeMessages(serverOutputState, chunkBuffer, (payload) => {
		writeContentLengthMessage(payload);
	});
});

child.on('error', (error: Error) => {
	//
	console.error('convex mcp bridge failed to start child process');
	console.error(error);
	process.exit(1);
});

child.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
	//
	if (signal) {
		console.error(`convex mcp process exited with signal ${signal}`);
		process.exit(1);
	}

	process.exit(code ?? 0);
});

process.on('SIGINT', () => {
	//
	child.kill('SIGINT');
});

process.on('SIGTERM', () => {
	//
	child.kill('SIGTERM');
});

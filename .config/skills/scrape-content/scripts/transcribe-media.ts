#!/usr/bin/env bun
// transcribe a local audio or video file with gemini 2.5 flash
// usage: bun transcribe-media.ts <media-file> [--output <file>] [--prompt <text>] [--model <model>] [--keep-upload] [--stdout]
//
// examples:
//   bun transcribe-media.ts ./clip.mp4
//   bun transcribe-media.ts ./clip.mp4 --output ./clip.transcript.md
//   bun transcribe-media.ts ./clip.mp4 --stdout

import { basename, dirname, extname, join, resolve } from 'path';
import { mkdir, stat, writeFile } from 'fs/promises';
import { z } from 'zod';

const geminiApiBaseUrl = 'https://generativelanguage.googleapis.com';
const defaultModel = 'gemini-2.5-flash';
const defaultPollMs = 5_000;
const defaultTimeoutMs = 15 * 60 * 1_000; // 15 minutes
const defaultRetryCount = 3;
const defaultRetryDelayMs = 2_000;
const defaultPrompt = [
	'Transcribe the spoken audio from this media file.',
	'Output only the transcript as Markdown.',
	'Preserve the original language.',
	'Add timestamps like [00:00] when the speaker changes or the topic shifts materially.',
	'Do not summarize.',
	'If a word is unclear, use [inaudible].',
	'Do not invent dialogue.',
].join(' ');

const fileStateSchema = z.enum(['STATE_UNSPECIFIED', 'PROCESSING', 'ACTIVE', 'FAILED']);

const fileSchema = z
	.object({
		name: z.string(),
		uri: z.string().optional(),
		mimeType: z.string().optional(),
		state: fileStateSchema.optional(),
		displayName: z.string().optional(),
		error: z
			.object({
				code: z.number().optional(),
				message: z.string().optional(),
				status: z.string().optional(),
			})
			.partial()
			.optional(),
	})
	.passthrough();

const wrappedFileSchema = z.object({
	file: fileSchema,
});

const apiErrorSchema = z.object({
	error: z.object({
		code: z.number().optional(),
		message: z.string(),
		status: z.string().optional(),
	}),
});

const candidateSchema = z
	.object({
		content: z
			.object({
				parts: z
					.array(
						z
							.object({
								text: z.string().optional(),
							})
							.passthrough(),
					)
					.optional(),
			})
			.optional(),
	})
	.passthrough();

const generateContentSchema = z
	.object({
		candidates: z.array(candidateSchema).optional(),
		promptFeedback: z
			.object({
				blockReason: z.string().optional(),
				blockReasonMessage: z.string().optional(),
			})
			.partial()
			.optional(),
	})
	.passthrough();

const cliOptionsSchema = z.object({
	inputPath: z.string().min(1),
	outputPath: z.string(),
	prompt: z.string().min(1),
	model: z.string().min(1),
	shouldKeepUpload: z.boolean(),
	shouldPrintToStdout: z.boolean(),
});

type FileRecord = z.infer<typeof fileSchema>;
type CliOptions = z.infer<typeof cliOptionsSchema>;

class GeminiHttpError extends Error {
	status: number;

	constructor(action: string, status: number, message: string) {
		super(`Gemini ${action} failed: ${status} ${message}`.trim());
		this.name = 'GeminiHttpError';
		this.status = status;
	}
}

function printUsage(): void {
	//
	console.info(
		'Usage: bun transcribe-media.ts <media-file> [--output <file>] [--prompt <text>] [--model <model>] [--keep-upload] [--stdout]',
	);
}

function parseArgs(args: string[]): CliOptions {
	//
	const inputCandidate = args[0];
	if (!inputCandidate) {
		printUsage();
		process.exit(1);
	}

	let outputPath: string | null = null;
	let prompt = defaultPrompt;
	let model = defaultModel;
	let shouldKeepUpload = false;
	let shouldPrintToStdout = false;

	for (let index = 1; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--output') {
			const nextArg = args[index + 1];
			if (!nextArg) throw new Error('--output requires a file path');
			outputPath = resolve(nextArg);
			index += 1;
			continue;
		}

		if (arg === '--prompt') {
			const nextArg = args[index + 1];
			if (!nextArg) throw new Error('--prompt requires text');
			prompt = nextArg;
			index += 1;
			continue;
		}

		if (arg === '--model') {
			const nextArg = args[index + 1];
			if (!nextArg) throw new Error('--model requires a model name');
			model = nextArg;
			index += 1;
			continue;
		}

		if (arg === '--keep-upload') {
			shouldKeepUpload = true;
			continue;
		}

		if (arg === '--stdout') {
			shouldPrintToStdout = true;
			continue;
		}

		throw new Error(`Unknown argument: ${arg}`);
	}

	const inputPath = resolve(inputCandidate);
	const defaultOutputPath = join(dirname(inputPath), `${basename(inputPath, extname(inputPath))}.transcript.md`);

	return cliOptionsSchema.parse({
		inputPath,
		outputPath: outputPath ?? defaultOutputPath,
		prompt,
		model,
		shouldKeepUpload,
		shouldPrintToStdout,
	});
}

function getApiKey(): string {
	//
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new Error('Missing GEMINI_API_KEY in the environment');
	return apiKey;
}

function inferMimeType(filePath: string): string {
	//
	const bunMimeType = Bun.file(filePath).type;
	if (bunMimeType) return bunMimeType;

	const extension = extname(filePath).toLowerCase();
	const fallbackMimeTypes: Record<string, string> = {
		'.aac': 'audio/aac',
		'.flac': 'audio/flac',
		'.m4a': 'audio/mp4',
		'.m4v': 'video/x-m4v',
		'.mov': 'video/quicktime',
		'.mp3': 'audio/mpeg',
		'.mp4': 'video/mp4',
		'.mpeg': 'video/mpeg',
		'.mpg': 'video/mpeg',
		'.ogg': 'audio/ogg',
		'.wav': 'audio/wav',
		'.webm': 'video/webm',
	};

	const mimeType = fallbackMimeTypes[extension];
	if (mimeType) return mimeType;

	throw new Error(`Could not infer MIME type for ${filePath}`);
}

function unwrapFileRecord(payload: unknown): FileRecord {
	//
	const wrappedFile = wrappedFileSchema.safeParse(payload);
	if (wrappedFile.success) return wrappedFile.data.file;

	return fileSchema.parse(payload);
}

async function parseJsonResponse(response: Response): Promise<unknown> {
	//
	const text = await response.text();
	if (!text) return {};

	try {
		return JSON.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to parse Gemini response JSON: ${message}`);
	}
}

async function ensureOk(response: Response, action: string): Promise<unknown> {
	//
	const payload = await parseJsonResponse(response);
	if (response.ok) return payload;

	const parsedError = apiErrorSchema.safeParse(payload);
	if (parsedError.success) {
		throw new GeminiHttpError(action, response.status, parsedError.data.error.message);
	}

	throw new GeminiHttpError(action, response.status, 'request failed');
}

function isRetryableError(error: unknown): boolean {
	//
	if (error instanceof GeminiHttpError) {
		return error.status === 429 || error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504;
	}

	const message = error instanceof Error ? error.message : String(error);
	return message.includes('Unable to connect');
}

async function runWithRetries<T>(label: string, task: (attempt: number) => Promise<T>): Promise<T> {
	//
	for (let attempt = 1; attempt <= defaultRetryCount; attempt += 1) {
		try {
			return await task(attempt);
		} catch (error) {
			if (!isRetryableError(error) || attempt === defaultRetryCount) throw error;

			const message = error instanceof Error ? error.message : String(error);
			const delayMs = defaultRetryDelayMs * attempt;
			console.warn(`${label} failed on attempt ${attempt}/${defaultRetryCount}: ${message}`);
			console.info(`Retrying in ${delayMs}ms`);
			await Bun.sleep(delayMs);
		}
	}

	throw new Error(`${label} failed after ${defaultRetryCount} attempts`);
}

async function uploadFile(apiKey: string, filePath: string, mimeType: string): Promise<FileRecord> {
	//
	return runWithRetries('Gemini upload', async () => {
		const fileStats = await stat(filePath);
		const startResponse = await fetch(`${geminiApiBaseUrl}/upload/v1beta/files?key=${apiKey}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Upload-Command': 'start',
				'X-Goog-Upload-Header-Content-Length': String(fileStats.size),
				'X-Goog-Upload-Header-Content-Type': mimeType,
				'X-Goog-Upload-Protocol': 'resumable',
			},
			body: JSON.stringify({
				file: {
					display_name: basename(filePath),
				},
			}),
		});

		if (!startResponse.ok) {
			await ensureOk(startResponse, 'upload start');
		}

		const uploadUrl = startResponse.headers.get('x-goog-upload-url');
		if (!uploadUrl) throw new Error('Gemini upload start succeeded but did not return an upload URL');

		const fileBytes = await Bun.file(filePath).arrayBuffer();
		const uploadResponse = await fetch(uploadUrl, {
			method: 'POST',
			headers: {
				'Content-Length': String(fileStats.size),
				'X-Goog-Upload-Command': 'upload, finalize',
				'X-Goog-Upload-Offset': '0',
			},
			body: fileBytes,
		});

		const payload = await ensureOk(uploadResponse, 'upload finalize');
		return unwrapFileRecord(payload);
	});
}

async function getFile(apiKey: string, name: string): Promise<FileRecord> {
	//
	const response = await fetch(`${geminiApiBaseUrl}/v1beta/${name}?key=${apiKey}`);
	const payload = await ensureOk(response, 'file metadata fetch');
	return unwrapFileRecord(payload);
}

async function waitForActiveFile(apiKey: string, initialFile: FileRecord): Promise<FileRecord> {
	//
	const deadline = Date.now() + defaultTimeoutMs;
	let currentFile = initialFile;

	while (currentFile.state !== 'ACTIVE') {
		if (currentFile.state === 'FAILED') {
			const reason = currentFile.error?.message ?? 'no reason returned';
			throw new Error(`Gemini file processing failed: ${reason}`);
		}

		if (Date.now() >= deadline) {
			throw new Error(`Timed out waiting for Gemini to process ${currentFile.name}`);
		}

		console.info(`Waiting for Gemini file processing: ${currentFile.state ?? 'STATE_UNSPECIFIED'}`);
		await Bun.sleep(defaultPollMs);
		currentFile = await getFile(apiKey, currentFile.name);
	}

	return currentFile;
}

function extractTranscript(payload: unknown): string {
	//
	const parsed = generateContentSchema.parse(payload);
	const textParts = (parsed.candidates ?? [])
		.flatMap((candidate) => candidate.content?.parts ?? [])
		.map((part) => part.text)
		.filter((text): text is string => Boolean(text))
		.map((text) => text.trim())
		.filter((text) => text.length > 0);

	if (textParts.length > 0) return textParts.join('\n\n');

	const blockReason = parsed.promptFeedback?.blockReason;
	if (blockReason) throw new Error(`Gemini returned no transcript. Block reason: ${blockReason}`);

	throw new Error('Gemini returned no transcript text');
}

async function generateTranscript(
	apiKey: string,
	file: FileRecord,
	mimeType: string,
	model: string,
	prompt: string,
): Promise<string> {
	//
	if (!file.uri) throw new Error(`Gemini file ${file.name} is missing a file URI`);

	return runWithRetries('Gemini transcript generation', async () => {
		const response = await fetch(`${geminiApiBaseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				contents: [
					{
						parts: [
							{ text: prompt },
							{
								file_data: {
									mime_type: mimeType,
									file_uri: file.uri,
								},
							},
						],
					},
				],
			}),
		});

		const payload = await ensureOk(response, 'generate content');
		return extractTranscript(payload);
	});
}

function formatMarkdownTranscript(inputPath: string, model: string, transcript: string): string {
	//
	const lines = [
		`# Transcript: ${basename(inputPath)}`,
		'',
		`- source: \`${inputPath}\``,
		`- model: \`${model}\``,
		`- generated: \`${new Date().toISOString()}\``,
		'',
		'---',
		'',
		transcript.trim(),
		'',
	];

	return lines.join('\n');
}

async function writeTranscript(outputPath: string, content: string): Promise<void> {
	//
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, content, 'utf8');
}

async function deleteUploadedFile(apiKey: string, fileName: string): Promise<void> {
	//
	const response = await fetch(`${geminiApiBaseUrl}/v1beta/${fileName}?key=${apiKey}`, {
		method: 'DELETE',
	});

	if (response.ok) return;

	const payload = await parseJsonResponse(response);
	const parsedError = apiErrorSchema.safeParse(payload);
	if (parsedError.success) {
		const message = parsedError.data.error.message;
		throw new Error(`Gemini file delete failed: ${message}`);
	}

	throw new Error(`Gemini file delete failed with status ${response.status}`);
}

async function main(): Promise<void> {
	//
	const options = parseArgs(process.argv.slice(2));
	const apiKey = getApiKey();
	const mimeType = inferMimeType(options.inputPath);

	console.info(`Uploading media to Gemini: ${options.inputPath}`);

	let uploadedFile: FileRecord | null = null;

	try {
		uploadedFile = await uploadFile(apiKey, options.inputPath, mimeType);
		const activeFile = await waitForActiveFile(apiKey, uploadedFile);

		console.info(`Generating transcript with ${options.model}`);
		const transcript = await generateTranscript(apiKey, activeFile, mimeType, options.model, options.prompt);
		const markdown = formatMarkdownTranscript(options.inputPath, options.model, transcript);

		if (options.shouldPrintToStdout) {
			console.log(markdown);
		} else {
			await writeTranscript(options.outputPath, markdown);
			console.info(`Saved transcript to ${options.outputPath}`);
		}
	} finally {
		if (uploadedFile && !options.shouldKeepUpload) {
			try {
				await deleteUploadedFile(apiKey, uploadedFile.name);
				console.info(`Deleted Gemini upload ${uploadedFile.name}`);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.warn(message);
			}
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

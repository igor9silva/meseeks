import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { z } from "zod";
import {
	type TasksContent,
	type TasksGraph,
	type TasksLookup,
	type TasksMeta,
	tasksContentSchema,
	tasksGraphSchema,
	tasksLookupSchema,
	tasksMetaSchema,
} from "~/server/taskIndexSchemas";

interface FileSet {
	metaPath: string;
	lookupPath: string;
	graphPath: string;
	contentPath: string;
}

interface SnapshotCache {
	signature: string;
	snapshot: TaskIndexSnapshot;
}

export interface TaskIndexSnapshot {
	meta: TasksMeta;
	lookup: TasksLookup;
	graph: TasksGraph;
	content: TasksContent;
}

export interface IndexHealth {
	isReady: boolean;
	generatedAt: string | null;
	generatedDir: string;
	errors: string[];
}

export interface SnapshotResult {
	health: IndexHealth;
	snapshot: TaskIndexSnapshot | null;
}

let snapshotCache: SnapshotCache | null = null;

function getGeneratedDir(): string {
	//
	return resolve(process.cwd(), "..", "private", "tasks", ".generated");
}

function getFiles(generatedDir: string): FileSet {
	//
	return {
		metaPath: join(generatedDir, "tasks.meta.json"),
		lookupPath: join(generatedDir, "tasks.lookup.json"),
		graphPath: join(generatedDir, "tasks.graph.json"),
		contentPath: join(generatedDir, "tasks.content.json"),
	};
}

function buildSignature(files: FileSet): {
	signature: string | null;
	errors: string[];
} {
	//
	const errors: string[] = [];
	const signatureParts: string[] = [];

	const entries: Array<[string, string]> = [
		["tasks.meta.json", files.metaPath],
		["tasks.lookup.json", files.lookupPath],
		["tasks.graph.json", files.graphPath],
		["tasks.content.json", files.contentPath],
	];

	for (const [name, filePath] of entries) {
		if (!existsSync(filePath)) {
			errors.push(`missing index file: ${name}`);
			continue;
		}

		const stats = statSync(filePath);
		signatureParts.push(`${name}:${stats.mtimeMs}:${stats.size}`);
	}

	if (errors.length > 0) return { signature: null, errors };
	return { signature: signatureParts.join("|"), errors };
}

function parseJsonFile<TSchema extends z.ZodType>(
	filePath: string,
	schema: TSchema,
):
	| { success: true; data: z.infer<TSchema> }
	| { success: false; error: string } {
	//
	try {
		const raw = readFileSync(filePath, "utf-8");
		const parsedJson: unknown = JSON.parse(raw);
		const parsedResult = schema.safeParse(parsedJson);

		if (!parsedResult.success) {
			return { success: false, error: `${filePath}: schema validation failed` };
		}

		return { success: true, data: parsedResult.data };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "unknown read/parse failure";
		return { success: false, error: `${filePath}: ${message}` };
	}
}

function parseSnapshot(files: FileSet): {
	snapshot: TaskIndexSnapshot | null;
	errors: string[];
} {
	//
	const errors: string[] = [];

	const metaResult = parseJsonFile(files.metaPath, tasksMetaSchema);
	const lookupResult = parseJsonFile(files.lookupPath, tasksLookupSchema);
	const graphResult = parseJsonFile(files.graphPath, tasksGraphSchema);
	const contentResult = parseJsonFile(files.contentPath, tasksContentSchema);

	if (!metaResult.success) errors.push(metaResult.error);
	if (!lookupResult.success) errors.push(lookupResult.error);
	if (!graphResult.success) errors.push(graphResult.error);
	if (!contentResult.success) errors.push(contentResult.error);

	if (errors.length > 0) return { snapshot: null, errors };
	if (
		!metaResult.success ||
		!lookupResult.success ||
		!graphResult.success ||
		!contentResult.success
	) {
		return { snapshot: null, errors: ["unexpected index parse state"] };
	}

	return {
		snapshot: {
			meta: metaResult.data,
			lookup: lookupResult.data,
			graph: graphResult.data,
			content: contentResult.data,
		},
		errors,
	};
}

export function readTaskIndexSnapshot(): SnapshotResult {
	//
	const generatedDir = getGeneratedDir();
	const files = getFiles(generatedDir);
	const signatureResult = buildSignature(files);

	if (signatureResult.signature === null) {
		return {
			health: {
				isReady: false,
				generatedAt: null,
				generatedDir,
				errors: signatureResult.errors,
			},
			snapshot: null,
		};
	}

	if (snapshotCache && snapshotCache.signature === signatureResult.signature) {
		return {
			health: {
				isReady: true,
				generatedAt: snapshotCache.snapshot.meta.generatedAt,
				generatedDir,
				errors: [],
			},
			snapshot: snapshotCache.snapshot,
		};
	}

	const parsedSnapshot = parseSnapshot(files);

	if (parsedSnapshot.snapshot === null) {
		return {
			health: {
				isReady: false,
				generatedAt: null,
				generatedDir,
				errors: parsedSnapshot.errors,
			},
			snapshot: null,
		};
	}

	snapshotCache = {
		signature: signatureResult.signature,
		snapshot: parsedSnapshot.snapshot,
	};

	return {
		health: {
			isReady: true,
			generatedAt: parsedSnapshot.snapshot.meta.generatedAt,
			generatedDir,
			errors: [],
		},
		snapshot: parsedSnapshot.snapshot,
	};
}

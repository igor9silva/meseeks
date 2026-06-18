import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { preparationActionDetailSchema } from 'schemas/actionDetailSchema';
import {
	compiledSkillProjectionSchema,
	compiledTriggerProjectionSchema,
	type CompileMutation,
	compileMutationSchema,
} from 'schemas/reactorSchema';
import { fileRevisionChangeKindSchema } from 'schemas/fileRevisionSchema';
import { configuredSkillKindSchema } from 'schemas/skillSchema';
import { zodToString } from 'lib/zodToString';
import { listRuntimeSourceFiles } from './files.private';
import { readText } from './storage.private';

export const compilePreparationSchema = z.object({
	sources: z.array(
		z.object({
			file: zid('files'),
			path: z.string().min(1),
			hash: z.string().optional(),
			storageKey: z.string().optional(),
			contentType: z.string().optional(),
		}),
	),
});

const genericInputSchema = zodToString(z.record(z.unknown()));
const textOutputSchema = zodToString(
	z.object({
		summary: z.string().optional(),
		content: z.string().optional(),
		contentType: z.string().optional(),
	}),
);

export async function prepareCompile(ctx: MutationCtx, { action }: { action: Doc<'actions'> }) {
	//
	const sources = await listRuntimeSourceFiles(ctx, {
		owner: action.owner,
		root: action.root,
	});
	const now = Date.now();

	return preparationActionDetailSchema.parse({
		action: action._id,
		owner: action.owner,
		createdAt: now,
		kind: 'preparation',
		skill: action.skill,
		skillKind: 'instinct',
		preparedAt: now,
		context: { sources },
	});
}

export async function compilePreparedSources(preparation: unknown): Promise<{
	mutation: CompileMutation;
	content: string;
	warnings: Array<string>;
}> {
	//
	const { sources } = compilePreparationSchema.parse(preparation);
	const mutation: CompileMutation = {
		kind: 'compile',
		skills: [],
		pages: [],
		triggers: [],
		diagnostics: [],
	};
	const seenSkills = new Set<string>();
	const seenPages = new Set<string>();

	for (const source of sources) {
		if (!source.storageKey) {
			mutation.diagnostics.push(`${source.path}: missing Object Storage body.`);
			continue;
		}

		const content = await readText({ storageKey: source.storageKey });
		if (isPageSource(source.path)) {
			const route = routeFromPagePath(source.path);
			if (seenPages.has(route)) {
				mutation.diagnostics.push(`${source.path}: duplicate page route ${route}.`);
				continue;
			}
			seenPages.add(route);
			mutation.pages.push({
				file: source.file,
				route,
				sourcePath: source.path,
				sourceHash: source.hash,
			});
			continue;
		}

		if (isSkillSource(source.path)) {
			const skill = catchDiagnostic(source.path, mutation.diagnostics, () =>
				compileSkillSource({
					file: source.file,
					path: source.path,
					hash: source.hash,
					content,
					diagnostics: mutation.diagnostics,
				}),
			);
			if (!skill) continue;
			if (seenSkills.has(skill.key)) {
				mutation.diagnostics.push(`${source.path}: duplicate skill key ${skill.key}.`);
				continue;
			}
			seenSkills.add(skill.key);
			mutation.skills.push(skill);
			continue;
		}

		if (isTriggerSource(source.path)) {
			const triggers = catchDiagnostic(source.path, mutation.diagnostics, () =>
				compileTriggerSource({
					file: source.file,
					path: source.path,
					hash: source.hash,
					content,
					diagnostics: mutation.diagnostics,
				}),
			);
			if (triggers) mutation.triggers.push(...triggers);
		}
	}

	const parsed = compileMutationSchema.parse(mutation);

	return {
		mutation: parsed,
		content: compileSummary(parsed),
		warnings: parsed.diagnostics,
	};
}

function compileSkillSource({
	file,
	path,
	hash,
	content,
	diagnostics,
}: {
	file: Doc<'files'>['_id'];
	path: string;
	hash?: string;
	content: string;
	diagnostics: Array<string>;
}) {
	//
	const kind = configuredSkillKindSchema.safeParse(stringProperty(content, 'kind'));
	if (!kind.success) {
		diagnostics.push(`${path}: skill kind must be one of think, request, or execute.`);
		return undefined;
	}

	const key = skillKeyFromPath(path);
	const description = stringProperty(content, 'description') ?? key;
	const config = compileSkillConfig({ content, description, kind: kind.data, path, diagnostics });
	if (!config) return undefined;

	return compiledSkillProjectionSchema.parse({
		key,
		description,
		kind: kind.data,
		inputSchema: genericInputSchema,
		outputSchema: textOutputSchema,
		config,
		sourceFile: file,
		sourcePath: path,
		sourceHash: hash,
	});
}

function compileSkillConfig({
	content,
	description,
	kind,
	path,
	diagnostics,
}: {
	content: string;
	description: string;
	kind: 'think' | 'request' | 'execute';
	path: string;
	diagnostics: Array<string>;
}) {
	//
	if (kind === 'think') {
		return {
			model: stringProperty(content, 'model') ?? 'auto',
			instructions: stringProperty(content, 'instructions') ?? description,
			temperature: numberProperty(content, 'temperature') ?? 0.7,
			availableSkills: stringArrayProperty(content, 'availableSkills') ?? [],
			historyMode: 'since last instructed',
		};
	}

	if (kind === 'request') {
		const url = stringProperty(content, 'url');
		if (!url) {
			diagnostics.push(`${path}: request skills require a url string.`);
			return undefined;
		}

		return {
			url,
			method: stringProperty(content, 'method') ?? 'GET',
			paramMappings: [],
		};
	}

	return {
		language: stringProperty(content, 'language') ?? 'javascript',
		timeoutSeconds: numberProperty(content, 'timeoutSeconds'),
	};
}

function compileTriggerSource({
	file,
	path,
	hash,
	content,
	diagnostics,
}: {
	file: Doc<'files'>['_id'];
	path: string;
	hash?: string;
	content: string;
	diagnostics: Array<string>;
}) {
	//
	const skill = stringProperty(content, 'skill');
	if (!skill) {
		diagnostics.push(`${path}: mutation trigger requires a reaction skill string.`);
		return [];
	}

	return triggerPatterns(content).map((pattern) =>
		compiledTriggerProjectionSchema.parse({
			kind: 'mutation' as const,
			events: mutationEvents(content),
			pattern,
			reactions: [
				{
					skill,
					input: reactionInput(content, skill),
				},
			],
			maxUses: maxUses(content),
			sourceFile: file,
			sourcePath: path,
			sourceHash: hash,
		}),
	);
}

function mutationEvents(content: string) {
	//
	const events = stringArrayProperty(content, 'events');
	if (events.length > 0) return z.array(fileRevisionChangeKindSchema).parse(events);

	return ['create', 'update'];
}

function maxUses(content: string) {
	//
	if (/maxUses\s*:\s*Infinity/.test(content)) return undefined;

	return numberProperty(content, 'maxUses');
}

function triggerPatterns(content: string) {
	//
	const patterns = stringArrayProperty(content, 'patterns');
	if (patterns.length > 0) return patterns;

	return [stringProperty(content, 'pattern')];
}

function reactionInput(content: string, skill: string) {
	//
	if (skill === 'compile') return {};

	return {
		message: stringProperty(content, 'message') ?? `Triggered ${skill}.`,
	};
}

function catchDiagnostic<T>(path: string, diagnostics: Array<string>, fn: () => T) {
	//
	try {
		return fn();
	} catch (error) {
		diagnostics.push(`${path}: ${errorMessage(error)}`);
		return undefined;
	}
}

function errorMessage(error: unknown) {
	//
	if (error instanceof Error) return error.message;

	return String(error);
}

function stringProperty(source: string, key: string) {
	//
	const match = new RegExp(`${key}\\s*:\\s*(['"\`])([\\s\\S]*?)\\1`).exec(source);
	if (!match) return undefined;

	return match[2];
}

function numberProperty(source: string, key: string) {
	//
	const match = new RegExp(`${key}\\s*:\\s*(\\d+(?:\\.\\d+)?)`).exec(source);
	if (!match) return undefined;

	return Number(match[1]);
}

function stringArrayProperty(source: string, key: string) {
	//
	const match = new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`).exec(source);
	if (!match) return [];

	return Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g)).map((item) => item[1]);
}

function isSkillSource(path: string) {
	//
	return path.startsWith('/.pro/skills/') && path.endsWith('.ts');
}

function isTriggerSource(path: string) {
	//
	return path.startsWith('/.pro/triggers/') && path.endsWith('.ts');
}

function isPageSource(path: string) {
	//
	if (path.includes('/.pro/')) return false;

	return path === '/page.tsx' || path.endsWith('/page.tsx');
}

function skillKeyFromPath(path: string) {
	//
	const key = path.slice('/.pro/skills/'.length).replace(/\.ts$/, '');
	if (key.endsWith('/index')) return key.slice(0, -'/index'.length);

	return key;
}

function routeFromPagePath(path: string) {
	//
	const route = path.replace(/\/page\.tsx$/, '');
	if (!route) return '/';

	return route;
}

function compileSummary(mutation: CompileMutation) {
	//
	const lines = [
		'# Compile',
		'',
		`- skills: ${mutation.skills.length}`,
		`- triggers: ${mutation.triggers.length}`,
		`- pages: ${mutation.pages.length}`,
		`- diagnostics: ${mutation.diagnostics.length}`,
	];

	if (mutation.diagnostics.length > 0) {
		lines.push('', '## Diagnostics', '', ...mutation.diagnostics.map((diagnostic) => `- ${diagnostic}`));
	}

	return lines.join('\n');
}

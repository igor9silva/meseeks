#!/usr/bin/env bun

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { z } from 'zod'

const defaultDir = resolve('private/tasks/links')
const maxImportDateLength = 10

const argsSchema = z.object({
	dir: z.string(),
})

const tickTickSnapshotSchema = z
	.object({
		taskId: z.string(),
		parentTaskId: z.string(),
		projectId: z.string(),
		projectName: z.string(),
		title: z.string(),
		content: z.string(),
		description: z.string(),
		status: z.number().int(),
		statusLabel: z.string(),
		priority: z.number().int(),
		sortOrder: z.number(),
		originalLink: z.string().url(),
		additionalLinks: z.array(z.string().url()),
		timeZone: z.string(),
		startAt: z.string().nullable(),
		endAt: z.string().nullable(),
		createdAt: z.string().nullable(),
		updatedAt: z.string().nullable(),
		parentTitle: z.string(),
		parentStartAt: z.string().nullable(),
		parentUpdatedAt: z.string().nullable(),
	})
	.passthrough()

const scrapeMetadataSchema = z
	.object({
		url: z.string().url(),
		kind: z.enum(['tweet', 'page']),
		error: z.string().nullable(),
		metadata: z.record(z.string(), z.unknown()),
	})
	.passthrough()

type TickTickSnapshot = z.infer<typeof tickTickSnapshotSchema>
type ScrapeMetadata = z.infer<typeof scrapeMetadataSchema>

function parseArgs(rawArgs: string[]) {
	//
	const dirIndex = rawArgs.indexOf('--dir')

	return argsSchema.parse({
		dir: dirIndex === -1 ? defaultDir : resolve(rawArgs[dirIndex + 1] ?? defaultDir),
	})
}

function mapTickTickPriority(priority: number) {
	//
	if (priority >= 5) return 'high'
	if (priority >= 3) return 'medium'
	return 'low'
}

function block(language: string, content: string) {
	//
	return `~~~~${language}\n${content}\n~~~~`
}

function getPrimaryScrapedContent(kind: ScrapeMetadata['kind'], markdown: string) {
	//
	if (kind !== 'tweet') return markdown.trim()

	const parts = markdown.split('\n---\n')
	if (parts.length < 2) return markdown.trim()

	return parts[1].trim()
}

function getRequiredMatch(fileContent: string, pattern: RegExp, label: string) {
	//
	const match = fileContent.match(pattern)
	if (!match) throw new Error(`Could not extract ${label}`)
	return match[1]
}

function getImportedAt(fileContent: string) {
	//
	const match = fileContent.match(/^### (\d{4}-\d{2}-\d{2})$/m)
	if (!match?.[1]) return null
	return match[1].slice(0, maxImportDateLength)
}

function parseFile(fileContent: string) {
	//
	const snapshotJson = getRequiredMatch(fileContent, /### TickTick Snapshot\n\n```json\n([\s\S]*?)\n```/, 'TickTick snapshot')
	const scrapeMarkdown = getRequiredMatch(
		fileContent,
		/### Extracted Markdown\n\n~~~~md\n([\s\S]*?)\n~~~~/,
		'scraped markdown',
	)
	const scrapeMetadataJson = getRequiredMatch(
		fileContent,
		/### Scrape Metadata\n\n```json\n([\s\S]*?)\n```/,
		'scrape metadata',
	)

	return {
		importedAt: getImportedAt(fileContent),
		snapshot: tickTickSnapshotSchema.parse(JSON.parse(snapshotJson)),
		scrapeMarkdown,
		scrapeMetadata: scrapeMetadataSchema.parse(JSON.parse(scrapeMetadataJson)),
	}
}

function renderFile(
	snapshot: TickTickSnapshot,
	scrapeMarkdown: string,
	scrapeMetadata: ScrapeMetadata,
	importedAt: string | null,
) {
	//
	const primaryScrapedContent = getPrimaryScrapedContent(scrapeMetadata.kind, scrapeMarkdown)
	const metadataPayload = {
		importedAt,
		tickTick: snapshot,
		scrape: scrapeMetadata,
	}

	return `---
title: ${JSON.stringify(snapshot.title)}
priority: ${mapTickTickPriority(snapshot.priority)}
tags: []
---

${snapshot.originalLink}

---

${primaryScrapedContent}

---

TickTick title

${block('text', snapshot.title)}

TickTick content

${block('text', snapshot.content)}

TickTick description

${block('text', snapshot.description)}

\`\`\`json
${JSON.stringify(metadataPayload, null, 2)}
\`\`\`
`
}

function main() {
	//
	const args = parseArgs(process.argv.slice(2))
	const fileNames = readdirSync(args.dir).filter((fileName) => fileName.endsWith('.mdx')).sort()

	for (const fileName of fileNames) {
		const filePath = join(args.dir, fileName)
		const fileContent = readFileSync(filePath, 'utf-8')
		let parsed: ReturnType<typeof parseFile>

		try {
			parsed = parseFile(fileContent)
		} catch (error) {
			throw new Error(`Failed to reshape ${fileName}: ${error instanceof Error ? error.message : String(error)}`)
		}

		const rewritten = renderFile(parsed.snapshot, parsed.scrapeMarkdown, parsed.scrapeMetadata, parsed.importedAt)

		writeFileSync(filePath, rewritten, 'utf-8')
	}

	console.info(`rewrote ${fileNames.length} files in ${args.dir}`)
}

main()

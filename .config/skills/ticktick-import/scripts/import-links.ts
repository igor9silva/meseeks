#!/usr/bin/env bun

import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Database } from 'bun:sqlite'
import { z } from 'zod'

import { API_KEYS } from '../../../../private/skills/config'
import { extractTweetId, scrapeTweet, toMarkdown } from '../../scrape-content/scripts/lib'

const coreDataUnixOffsetSeconds = 978307200
const defaultOutputDir = resolve('private/tasks/inbox')
const defaultSummaryFile = '/tmp/meseeks-links-import-summary.json'
const defaultDbPath = `${process.env.HOME ?? ''}/Library/Group Containers/75TY9UT8AY.com.TickTick.task.mac/OSXCoreDataObjC.storedata`
const defaultTimeZone = 'Europe/Lisbon'
const maxSummaryLength = 200

const argsSchema = z.object({
	outputDir: z.string(),
	summaryFile: z.string(),
	dbPath: z.string(),
	concurrency: z.number().int().positive(),
	importDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	parentTitle: z.string().min(1),
	skipExisting: z.boolean(),
	deleteMissing: z.boolean(),
})

const linksTaskRowSchema = z.object({
	entityId: z.string(),
	title: z.string(),
	content: z.string(),
	description: z.string(),
	status: z.number().int(),
	startUtc: z.string().nullable(),
	endUtc: z.string().nullable(),
	createdUtc: z.string().nullable(),
	updatedUtc: z.string().nullable(),
	projectId: z.string(),
	projectName: z.string(),
	timeZoneName: z.string().nullable(),
})

const childTaskRowSchema = z.object({
	entityId: z.string(),
	title: z.string(),
	content: z.string(),
	description: z.string(),
	status: z.number().int(),
	priority: z.number().int(),
	sortOrder: z.number(),
	startUtc: z.string().nullable(),
	endUtc: z.string().nullable(),
	createdUtc: z.string().nullable(),
	updatedUtc: z.string().nullable(),
	projectId: z.string(),
	projectName: z.string(),
	timeZoneName: z.string().nullable(),
	parentId: z.string(),
})

const firecrawlMetadataSchema = z.record(z.string(), z.unknown())

const firecrawlResponseSchema = z
	.object({
		success: z.boolean().optional(),
		error: z.string().optional(),
		markdown: z.string().optional(),
		data: z
			.object({
				markdown: z.string().optional(),
				metadata: firecrawlMetadataSchema.optional(),
			})
			.passthrough()
			.optional(),
	})
	.passthrough()

const tweetResponseSchema = z
	.object({
		detail: z.string().optional(),
		creation_date: z.string().optional(),
		text: z.string().optional(),
		user: z
			.object({
				username: z.string().optional(),
				name: z.string().optional(),
			})
			.optional(),
	})
	.passthrough()

const scrapeResultSchema = z.object({
	url: z.string().url(),
	kind: z.enum(['tweet', 'page']),
	description: z.string(),
	markdown: z.string(),
	metadata: firecrawlMetadataSchema,
	error: z.string().nullable(),
})

const outputSummaryRowSchema = z.object({
	action: z.enum(['created', 'kept', 'deleted']),
	taskId: z.string(),
	filePath: z.string(),
	originalLink: z.string().url(),
	description: z.string().nullable(),
})

const existingFilePayloadSchema = z
	.object({
		importedAt: z.string().nullable().optional(),
		tickTick: z
			.object({
				taskId: z.string(),
				originalLink: z.string().url(),
			})
			.passthrough(),
		scrape: z
			.object({
				url: z.string().url(),
			})
			.passthrough(),
	})
	.passthrough()

type LinksTaskRow = z.infer<typeof linksTaskRowSchema>
type ChildTaskRow = z.infer<typeof childTaskRowSchema>
type ScrapeResult = z.infer<typeof scrapeResultSchema>
type OutputSummaryRow = z.infer<typeof outputSummaryRowSchema>
type ExistingFilePayload = z.infer<typeof existingFilePayloadSchema>

interface ExistingFileInfo {
	filePath: string
	payload: ExistingFilePayload
}

function parseArgs(rawArgs: string[]) {
	//
	const outputDirIndex = rawArgs.indexOf('--output-dir')
	const summaryFileIndex = rawArgs.indexOf('--summary-file')
	const dbPathIndex = rawArgs.indexOf('--db-path')
	const concurrencyIndex = rawArgs.indexOf('--concurrency')
	const importDateIndex = rawArgs.indexOf('--import-date')
	const parentTitleIndex = rawArgs.indexOf('--parent-title')

	return argsSchema.parse({
		outputDir: outputDirIndex === -1 ? defaultOutputDir : resolve(rawArgs[outputDirIndex + 1] ?? defaultOutputDir),
		summaryFile:
			summaryFileIndex === -1 ? defaultSummaryFile : resolve(rawArgs[summaryFileIndex + 1] ?? defaultSummaryFile),
		dbPath: dbPathIndex === -1 ? defaultDbPath : resolve(rawArgs[dbPathIndex + 1] ?? defaultDbPath),
		concurrency:
			concurrencyIndex === -1
				? 4
				: Number.parseInt(rawArgs[concurrencyIndex + 1] ?? '4', 10),
		importDate: importDateIndex === -1 ? getTodayInTimeZone(defaultTimeZone) : rawArgs[importDateIndex + 1] ?? '',
		parentTitle: parentTitleIndex === -1 ? 'links' : rawArgs[parentTitleIndex + 1] ?? '',
		skipExisting: rawArgs.includes('--skip-existing'),
		deleteMissing: rawArgs.includes('--delete-missing'),
	})
}

function parseUtcString(value: string | null) {
	//
	if (!value) return null

	const date = new Date(value.replace(' ', 'T') + 'Z')
	if (Number.isNaN(date.getTime())) return null
	return date
}

function formatDateInTimeZone(date: Date, timeZone: string) {
	//
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})

	return formatter.format(date)
}

function formatDateTimeInTimeZone(date: Date | null, timeZone: string) {
	//
	if (!date) return null

	const formatter = new Intl.DateTimeFormat('sv-SE', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	})

	return formatter.format(date).replace(' ', 'T')
}

function getTodayInTimeZone(timeZone: string) {
	//
	return formatDateInTimeZone(new Date(), timeZone)
}

function normalizeUrlCandidate(candidate: string) {
	//
	const attempts = [candidate.trim()]
	const trailingCharacters = new Set([')', '.', ',', ']', '>'])
	let current = candidate.trim()

	while (current.length > 0 && trailingCharacters.has(current.at(-1) ?? '')) {
		current = current.slice(0, -1)
		attempts.push(current)
	}

	for (const attempt of attempts) {
		try {
			const parsed = new URL(attempt)
			return parsed.toString()
		} catch {
			// try the next trimmed version
		}
	}

	return null
}

function extractUrlsFromText(text: string) {
	//
	const matches: string[] = []
	const markdownLinkPattern = /\[[^\]]*?\]\((https?:\/\/[^)\s]+)\)/g
	const rawUrlPattern = /https?:\/\/[^\s]+/g

	for (const match of text.matchAll(markdownLinkPattern)) {
		const normalized = normalizeUrlCandidate(match[1] ?? '')
		if (!normalized) continue
		if (!matches.includes(normalized)) matches.push(normalized)
	}

	for (const match of text.matchAll(rawUrlPattern)) {
		const normalized = normalizeUrlCandidate(match[0] ?? '')
		if (!normalized) continue
		if (!matches.includes(normalized)) matches.push(normalized)
	}

	return matches
}

function pickOriginalLink(task: ChildTaskRow) {
	//
	return [...extractUrlsFromText(task.title), ...extractUrlsFromText(task.content), ...extractUrlsFromText(task.description)]
		.filter((url, index, urls) => urls.indexOf(url) === index)
		.at(0)
}

function slugify(value: string) {
	//
	return value
		.toLowerCase()
		.replace(/https?:\/\//g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+/g, '')
		.replace(/-+$/g, '')
		.slice(0, 80)
}

function getHostLabel(url: URL) {
	//
	const host = url.hostname.replace(/^www\./, '')

	if (host.endsWith('x.com')) return 'x'
	if (host.endsWith('twitter.com')) return 'twitter'
	if (host.endsWith('instagram.com')) return 'instagram'
	if (host.endsWith('youtube.com')) return 'youtube'
	if (host.endsWith('youtu.be')) return 'youtube'

	return host.split('.').at(0) ?? 'link'
}

function buildFileSlug(task: ChildTaskRow, originalLink: string) {
	//
	try {
		const parsedUrl = new URL(originalLink)
		const pathSegments = parsedUrl.pathname.split('/').filter(Boolean)
		const hostLabel = getHostLabel(parsedUrl)
		const taskSuffix = task.entityId.slice(-8)

		if (hostLabel === 'x' || hostLabel === 'twitter') {
			const statusIndex = pathSegments.indexOf('status')
			const tweetId = statusIndex === -1 ? null : pathSegments[statusIndex + 1]
			if (tweetId) return `${slugify(`${hostLabel}-${tweetId}`)}-${taskSuffix}`
		}

		if (hostLabel === 'instagram') {
			const identifier = pathSegments.at(1) ?? pathSegments.at(0) ?? task.entityId
			return `${slugify(`${hostLabel}-${identifier}`)}-${taskSuffix}`
		}

		if (hostLabel === 'youtube') {
			const identifier = parsedUrl.searchParams.get('v') ?? pathSegments.at(1) ?? pathSegments.at(0) ?? task.entityId
			return `${slugify(`${hostLabel}-${identifier}`)}-${taskSuffix}`
		}

		const interestingSegments = pathSegments.slice(0, 2)
		return `${slugify([hostLabel].concat(interestingSegments).join('-'))}-${taskSuffix}`
	} catch {
		return `${slugify(task.title) || 'link'}-${task.entityId.slice(-8)}`
	}
}

function mapTickTickPriority(priority: number) {
	//
	if (priority >= 5) return 'high'
	if (priority >= 3) return 'medium'
	if (priority >= 1) return 'low'
	return null
}

function renderPriorityFrontmatter(priority: number) {
	//
	const localPriority = mapTickTickPriority(priority)
	if (!localPriority) return ''

	return `priority: ${localPriority}\n`
}

function mapTickTickStatus(status: number) {
	//
	if (status === 2) return 'completed'
	if (status === 1) return 'archived'
	return 'open'
}

function block(language: string, content: string) {
	//
	return `~~~~${language}\n${content}\n~~~~`
}

function cleanTextForDescription(text: string) {
	//
	return text
		.replace(/\[(.*?)\]\((.*?)\)/g, '$1')
		.replace(/^#+\s+/gm, '')
		.replace(/```[\s\S]*?```/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}

function truncateText(text: string, maxLength: number) {
	//
	if (text.length <= maxLength) return text
	return `${text.slice(0, maxLength - 3).trimEnd()}...`
}

function describeMarkdown(markdown: string) {
	//
	const meaningfulLines = markdown
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.filter((line) => line !== '---')
		.filter((line) => !line.startsWith('```'))
		.filter((line) => !line.startsWith('~~~~'))
		.filter((line) => !/^https?:\/\//.test(line))
		.filter((line) => !/^\w+\s+\d{1,2},\s+\d{4}\s+\(/.test(line))

	const description = cleanTextForDescription(meaningfulLines.slice(0, 3).join(' '))
	if (!description) return 'No meaningful content extracted'
	return truncateText(description, maxSummaryLength)
}

function getPrimaryScrapedContent(scrapeResult: Pick<ScrapeResult, 'kind' | 'markdown'>) {
	//
	if (scrapeResult.kind !== 'tweet') return scrapeResult.markdown.trim()

	const parts = scrapeResult.markdown.split('\n---\n')
	if (parts.length < 2) return scrapeResult.markdown.trim()

	return parts[1].trim()
}

function getRequiredMatch(fileContent: string, pattern: RegExp, label: string) {
	//
	const match = fileContent.match(pattern)
	if (!match) throw new Error(`Could not extract ${label}`)
	return match[1] ?? ''
}

function collectExistingTaskFiles(directory: string) {
	//
	const entries = readdirSync(directory, { withFileTypes: true })
	const filePaths: string[] = []

	for (const entry of entries) {
		const entryPath = join(directory, entry.name)

		if (entry.isDirectory()) {
			filePaths.push(...collectExistingTaskFiles(entryPath))
			continue
		}

		if (!entry.isFile()) continue
		if (!entry.name.endsWith('.mdx')) continue

		filePaths.push(entryPath)
	}

	return filePaths.sort()
}

function loadExistingFiles(outputDir: string) {
	//
	const filesByTaskId = new Map<string, ExistingFileInfo>()
	const filePaths = collectExistingTaskFiles(outputDir)

	for (const filePath of filePaths) {
		const fileContent = readFileSync(filePath, 'utf-8')

		try {
			const payloadJson = getRequiredMatch(fileContent, /```json\n([\s\S]*?)\n```[\s\n]*$/, 'final metadata payload')
			const payload = existingFilePayloadSchema.parse(JSON.parse(payloadJson))

			filesByTaskId.set(payload.tickTick.taskId, {
				filePath,
				payload,
			})
		} catch (error) {
			console.warn(`could not parse existing file metadata for ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	return filesByTaskId
}

async function scrapeWithFirecrawl(url: string) {
	//
	const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${API_KEYS.scrapeLink}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			url,
			formats: ['markdown'],
			onlyMainContent: true,
		}),
	})

	const rawResponseText = await response.text()

	if (!response.ok) {
		const errorDescription = truncateText(`Scrape failed: ${response.status} ${response.statusText}`, maxSummaryLength)

		return scrapeResultSchema.parse({
			url,
			kind: 'page',
			description: errorDescription,
			markdown: '',
			metadata: {
				httpStatus: response.status,
				httpStatusText: response.statusText,
				rawResponseText,
			},
			error: errorDescription,
		})
	}

	let parsedJson: unknown = {}
	try {
		parsedJson = JSON.parse(rawResponseText)
	} catch {
		parsedJson = { markdown: rawResponseText }
	}

	const parsed = firecrawlResponseSchema.parse(parsedJson)
	const markdown = parsed.data?.markdown ?? parsed.markdown ?? ''
	const metadata = parsed.data?.metadata ?? {}
	const error = parsed.error ?? null
	const descriptionSource =
		typeof metadata.title === 'string' && metadata.title.trim().length > 0
			? `${metadata.title}\n${markdown}`
			: markdown
	const description = error ? truncateText(error, maxSummaryLength) : describeMarkdown(descriptionSource)

	return scrapeResultSchema.parse({
		url,
		kind: 'page',
		description,
		markdown,
		metadata: {
			success: parsed.success ?? response.ok,
			metadata,
		},
		error,
	})
}

async function scrapeLink(url: string) {
	//
	const tweetId = extractTweetId(url)
	if (!tweetId) return scrapeWithFirecrawl(url)

	try {
		const rawTweet = tweetResponseSchema.parse(await scrapeTweet(tweetId))
		const markdown = toMarkdown(rawTweet, url)
		const description = rawTweet.detail ? truncateText(rawTweet.detail, maxSummaryLength) : describeMarkdown(markdown)

		return scrapeResultSchema.parse({
			url,
			kind: 'tweet',
			description,
			markdown,
			metadata: {
				creationDate: rawTweet.creation_date ?? null,
				authorName: rawTweet.user?.name ?? null,
				authorUsername: rawTweet.user?.username ?? null,
			},
			error: rawTweet.detail ?? null,
		})
	} catch (error) {
		console.warn(`tweet scrape failed for ${url}, falling back to firecrawl`)
		return scrapeWithFirecrawl(url)
	}
}

function renderTaskFile(
	task: ChildTaskRow,
	linksTask: LinksTaskRow,
	originalLink: string,
	scrapeResult: ScrapeResult,
	importDate: string,
) {
	//
	const sourceTimeZone = task.timeZoneName ?? linksTask.timeZoneName ?? defaultTimeZone
	const rawTickTickSnapshot = {
		taskId: task.entityId,
		parentTaskId: task.parentId,
		projectId: task.projectId,
		projectName: task.projectName,
		title: task.title,
		content: task.content,
		description: task.description,
		status: task.status,
		statusLabel: mapTickTickStatus(task.status),
		priority: task.priority,
		sortOrder: task.sortOrder,
		originalLink,
		additionalLinks: [...extractUrlsFromText(task.content), ...extractUrlsFromText(task.description)].filter(
			(url, index, urls) => urls.indexOf(url) === index && url !== originalLink,
		),
		timeZone: sourceTimeZone,
		startAt: formatDateTimeInTimeZone(parseUtcString(task.startUtc), sourceTimeZone),
		endAt: formatDateTimeInTimeZone(parseUtcString(task.endUtc), sourceTimeZone),
		createdAt: formatDateTimeInTimeZone(parseUtcString(task.createdUtc), sourceTimeZone),
		updatedAt: formatDateTimeInTimeZone(parseUtcString(task.updatedUtc), sourceTimeZone),
		parentTitle: linksTask.title,
		parentStartAt: formatDateTimeInTimeZone(parseUtcString(linksTask.startUtc), sourceTimeZone),
		parentUpdatedAt: formatDateTimeInTimeZone(parseUtcString(linksTask.updatedUtc), sourceTimeZone),
	}
	const primaryScrapedContent = getPrimaryScrapedContent(scrapeResult)
	const metadataPayload = {
		importedAt: importDate,
		tickTick: rawTickTickSnapshot,
		scrape: {
			url: scrapeResult.url,
			kind: scrapeResult.kind,
			error: scrapeResult.error,
			metadata: scrapeResult.metadata,
		},
	}

	return `---
title: ${JSON.stringify(task.title)}
${renderPriorityFrontmatter(task.priority)}tags: []
---

${originalLink}

---

${primaryScrapedContent}

---

TickTick title

${block('text', task.title)}

TickTick content

${block('text', task.content)}

TickTick description

${block('text', task.description)}

\`\`\`json
${JSON.stringify(metadataPayload, null, 2)}
\`\`\`
`
}

function queryLinksTaskCandidates(database: Database, parentTitle: string) {
	//
	const statement = database.query(`
		SELECT
			t.ZENTITYID AS entityId,
			COALESCE(t.ZTITLE, '') AS title,
			COALESCE(t.ZCONTENT, '') AS content,
			COALESCE(t.ZDEZCRIPTION, '') AS description,
			t.ZSTATUS AS status,
			datetime(t.ZSTARTDATE + ${coreDataUnixOffsetSeconds}, 'unixepoch') AS startUtc,
			datetime(t.ZENDDATE + ${coreDataUnixOffsetSeconds}, 'unixepoch') AS endUtc,
			datetime(t.ZCREATIONDATE + ${coreDataUnixOffsetSeconds}, 'unixepoch') AS createdUtc,
			datetime(t.ZLASTMODIFIEDDATE + ${coreDataUnixOffsetSeconds}, 'unixepoch') AS updatedUtc,
			COALESCE(t.ZPROJECTID, p.ZENTITYID, '') AS projectId,
			COALESCE(p.ZNAME, '') AS projectName,
			t.ZTIMEZONENAME AS timeZoneName
		FROM ZTTTASK t
		LEFT JOIN ZTTPROJECT p ON t.ZPROJECT = p.Z_PK
		WHERE lower(COALESCE(t.ZTITLE, '')) = ?
			AND COALESCE(p.ZISINBOX, 0) = 1
		ORDER BY t.ZLASTMODIFIEDDATE DESC
	`)

	return linksTaskRowSchema.array().parse(statement.all(parentTitle.toLowerCase()))
}

function pickCurrentLinksTask(candidates: LinksTaskRow[]) {
	//
	const activeCandidates = candidates.filter((candidate) => candidate.status === 0)
	const matchingCandidates = activeCandidates.filter((candidate) => {
		const candidateDate = parseUtcString(candidate.startUtc)
		if (!candidateDate) return false

		const timeZone = candidate.timeZoneName ?? defaultTimeZone
		return formatDateInTimeZone(candidateDate, timeZone) === getTodayInTimeZone(timeZone)
	})

	if (matchingCandidates.length > 0) return matchingCandidates[0]
	if (activeCandidates.length > 0) return activeCandidates[0]
	return candidates[0] ?? null
}

function queryChildTasks(database: Database, parentId: string) {
	//
	const statement = database.query(`
		SELECT
			t.ZENTITYID AS entityId,
			COALESCE(t.ZTITLE, '') AS title,
			COALESCE(t.ZCONTENT, '') AS content,
			COALESCE(t.ZDEZCRIPTION, '') AS description,
			t.ZSTATUS AS status,
			t.ZPRIORITY AS priority,
			t.ZSORTORDER AS sortOrder,
			datetime(t.ZSTARTDATE + ${coreDataUnixOffsetSeconds}, 'unixepoch') AS startUtc,
			datetime(t.ZENDDATE + ${coreDataUnixOffsetSeconds}, 'unixepoch') AS endUtc,
			datetime(t.ZCREATIONDATE + ${coreDataUnixOffsetSeconds}, 'unixepoch') AS createdUtc,
			datetime(t.ZLASTMODIFIEDDATE + ${coreDataUnixOffsetSeconds}, 'unixepoch') AS updatedUtc,
			COALESCE(t.ZPROJECTID, p.ZENTITYID, '') AS projectId,
			COALESCE(p.ZNAME, '') AS projectName,
			t.ZTIMEZONENAME AS timeZoneName,
			COALESCE(t.ZPARENTID, '') AS parentId
		FROM ZTTTASK t
		LEFT JOIN ZTTPROJECT p ON t.ZPROJECT = p.Z_PK
		WHERE COALESCE(t.ZPARENTID, '') = ?
		ORDER BY t.ZSORTORDER ASC
	`)

	return childTaskRowSchema.array().parse(statement.all(parentId))
}

async function mapWithConcurrency<TInput, TOutput>(
	items: TInput[],
	concurrency: number,
	mapper: (item: TInput, index: number) => Promise<TOutput>,
) {
	//
	const results = new Array<TOutput>(items.length)
	let nextIndex = 0

	const workerCount = Math.min(concurrency, items.length)
	const workers = Array.from({ length: workerCount }, async () => {
		//
		while (nextIndex < items.length) {
			const currentIndex = nextIndex
			nextIndex += 1
			results[currentIndex] = await mapper(items[currentIndex], currentIndex)
		}
	})

	await Promise.all(workers)
	return results
}

async function main() {
	//
	const parsedArgs = parseArgs(process.argv.slice(2))
	mkdirSync(parsedArgs.outputDir, { recursive: true })

	const database = new Database(parsedArgs.dbPath, { readonly: true })

	try {
		const existingFilesByTaskId = loadExistingFiles(parsedArgs.outputDir)
		const linksTaskCandidates = queryLinksTaskCandidates(database, parsedArgs.parentTitle)
		const currentLinksTask = pickCurrentLinksTask(linksTaskCandidates)

		if (!currentLinksTask) {
			throw new Error(`Could not find an Inbox task named "${parsedArgs.parentTitle}"`)
		}

		console.info(`using TickTick task ${currentLinksTask.entityId} (${currentLinksTask.title})`)

		const childTasks = queryChildTasks(database, currentLinksTask.entityId)
		console.info(`found ${childTasks.length} child tasks`)
		const childTaskIds = new Set(childTasks.map((task) => task.entityId))
		const deletedSummaries: OutputSummaryRow[] = []

		if (parsedArgs.deleteMissing) {
			for (const [taskId, existingFile] of existingFilesByTaskId) {
				if (childTaskIds.has(taskId)) continue

				unlinkSync(existingFile.filePath)
				existingFilesByTaskId.delete(taskId)
				console.info(`deleted ${existingFile.filePath}`)

				deletedSummaries.push(
					outputSummaryRowSchema.parse({
						action: 'deleted',
						taskId,
						filePath: existingFile.filePath,
						originalLink: existingFile.payload.tickTick.originalLink,
						description: null,
					}),
				)
			}
		}

		const keptSummaries: OutputSummaryRow[] = []
		const tasksToCreate = childTasks.filter((task) => {
			//
			if (!parsedArgs.skipExisting) return true

			const existingFile = existingFilesByTaskId.get(task.entityId)
			if (!existingFile) return true

			const currentOriginalLink = pickOriginalLink(task)
			if (currentOriginalLink && currentOriginalLink !== existingFile.payload.tickTick.originalLink) {
				console.warn(
					`task ${task.entityId} points to ${currentOriginalLink}, but existing file keeps ${existingFile.payload.tickTick.originalLink}; leaving it untouched because --skip-existing was requested`,
				)
			}

			keptSummaries.push(
				outputSummaryRowSchema.parse({
					action: 'kept',
					taskId: task.entityId,
					filePath: existingFile.filePath,
					originalLink: existingFile.payload.tickTick.originalLink,
					description: null,
				}),
			)
			return false
		})

		console.info(`keeping ${keptSummaries.length} existing files`)
		console.info(`creating ${tasksToCreate.length} new files`)

		const createdSummaries = await mapWithConcurrency(tasksToCreate, parsedArgs.concurrency, async (task, index) => {
			//
			const originalLink = pickOriginalLink(task)
			if (!originalLink) {
				throw new Error(`Task ${task.entityId} does not contain a link in its title, content, or description`)
			}

			console.info(`[${index + 1}/${tasksToCreate.length}] scraping ${originalLink}`)
			const scrapeResult = await scrapeLink(originalLink)
			const fileSlug = buildFileSlug(task, originalLink)
			const filePath = join(parsedArgs.outputDir, fileSlug, '_index.mdx')
			const fileContent = renderTaskFile(task, currentLinksTask, originalLink, scrapeResult, parsedArgs.importDate)

			mkdirSync(dirname(filePath), { recursive: true })
			writeFileSync(filePath, fileContent, 'utf-8')

			return outputSummaryRowSchema.parse({
				action: 'created',
				taskId: task.entityId,
				filePath,
				originalLink,
				description: scrapeResult.description,
			})
		})

		const summaries = deletedSummaries.concat(keptSummaries, createdSummaries)

		writeFileSync(parsedArgs.summaryFile, JSON.stringify(summaries, null, 2), 'utf-8')
		console.info(`sync complete for ${parsedArgs.outputDir}`)
		console.info(`deleted ${deletedSummaries.length}, kept ${keptSummaries.length}, created ${createdSummaries.length}`)
		console.info(`summary saved to ${parsedArgs.summaryFile}`)
	} finally {
		database.close()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})

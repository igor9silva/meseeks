#!/usr/bin/env bun

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Database } from 'bun:sqlite'
import { z } from 'zod'

const tickTickDbPath = `${process.env.HOME ?? ''}/Library/Group Containers/75TY9UT8AY.com.TickTick.task.mac/OSXCoreDataObjC.storedata`
const referencesDir = resolve('private/tasks/links/references')
const defaultSummaryPath = '/tmp/ticktick-references-create-summary.json'
const tickTickApiBaseUrl = 'https://api.ticktick.com/api/v2'
const referencesProjectName = 'references'
const probeTitle = '__CODEX_TICKTICK_WRITE_PROBE__'

const argsSchema = z.object({
	summaryFile: z.string(),
})

const userRowSchema = z.object({
	accessToken: z.string().min(1),
	clientId: z.string().min(1),
})

const projectRowSchema = z.object({
	projectId: z.string().min(1),
	projectName: z.string().min(1),
})

const existingTaskRowSchema = z.object({
	taskId: z.string().min(1),
	title: z.string(),
	content: z.string(),
	description: z.string(),
})

const metadataPayloadSchema = z.object({
	tickTick: z
		.object({
			title: z.string(),
			content: z.string(),
			description: z.string(),
			originalLink: z.string().url(),
		})
		.passthrough(),
})

const localReferenceTaskSchema = z.object({
	filePath: z.string().min(1),
	originalLink: z.string().url(),
	title: z.string().min(1),
	content: z.string(),
	description: z.string(),
})

const summaryRowSchema = z.object({
	action: z.enum(['created', 'kept']),
	filePath: z.string().min(1).nullable(),
	originalLink: z.string().url().nullable(),
	title: z.string().min(1),
	taskId: z.string().min(1),
})

type UserRow = z.infer<typeof userRowSchema>
type ProjectRow = z.infer<typeof projectRowSchema>
type ExistingTaskRow = z.infer<typeof existingTaskRowSchema>
type LocalReferenceTask = z.infer<typeof localReferenceTaskSchema>
type SummaryRow = z.infer<typeof summaryRowSchema>

function parseArgs(rawArgs: string[]) {
	//
	const summaryFileIndex = rawArgs.indexOf('--summary-file')

	return argsSchema.parse({
		summaryFile:
			summaryFileIndex === -1 ? defaultSummaryPath : resolve(rawArgs[summaryFileIndex + 1] ?? defaultSummaryPath),
	})
}

function getRequiredMatch(fileContent: string, pattern: RegExp, label: string) {
	//
	const match = fileContent.match(pattern)
	if (!match) throw new Error(`Could not extract ${label}`)
	return match[1] ?? ''
}

function stripFrontmatter(fileContent: string) {
	//
	return fileContent.replace(/^---\n[\s\S]*?\n---\n\n/, '')
}

function splitTaskSections(fileContent: string) {
	//
	const contentWithoutFrontmatter = stripFrontmatter(fileContent)
	const sections = contentWithoutFrontmatter.split('\n\n---\n\n')

	if (sections.length < 3) {
		throw new Error('Could not split task sections')
	}

	return {
		originalLinkSection: sections[0] ?? '',
		scrapedSection: sections[1] ?? '',
	}
}

function isLikelyUrl(value: string) {
	//
	try {
		new URL(value.trim())
		return true
	} catch {
		return false
	}
}

function cleanCandidateTitle(value: string) {
	//
	const withoutLeadingUrl = value.replace(/^https?:\/\/\S+\s+/, '').trim()
	const withoutMarkdownLink = withoutLeadingUrl.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1').trim()
	return withoutMarkdownLink
}

function deriveTickTickTitle(originalTitle: string, originalLink: string, scrapedSection: string) {
	//
	if (!isLikelyUrl(originalTitle)) return originalTitle.trim()

	const candidateLines = scrapedSection
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.filter((line) => !line.startsWith('[@'))
		.filter((line) => !line.startsWith('Likes:'))
		.filter((line) => line !== originalLink)

	for (const line of candidateLines) {
		const cleanedLine = cleanCandidateTitle(line)
		if (cleanedLine.length === 0) continue
		return cleanedLine.slice(0, 180)
	}

	return originalLink
}

function buildTickTickContent(originalLink: string, scrapedSection: string, originalContent: string, originalDescription: string) {
	//
	const sections = [originalLink, scrapedSection.trim()]

	if (originalContent.trim().length > 0) {
		sections.push(`Original TickTick content:\n${originalContent.trim()}`)
	}

	if (originalDescription.trim().length > 0) {
		sections.push(`Original TickTick description:\n${originalDescription.trim()}`)
	}

	return sections.filter((section) => section.length > 0).join('\n\n')
}

function loadLocalReferenceTasks(directory: string) {
	//
	const filePaths = readdirSync(directory)
		.filter((fileName) => fileName.endsWith('.mdx'))
		.sort()
		.map((fileName) => join(directory, fileName))

	return filePaths.map((filePath) => {
		const fileContent = readFileSync(filePath, 'utf-8')
		const metadataJson = getRequiredMatch(fileContent, /```json\n([\s\S]*?)\n```[\s\n]*$/, 'metadata payload')
		const metadataPayload = metadataPayloadSchema.parse(JSON.parse(metadataJson))
		const taskSections = splitTaskSections(fileContent)
		const originalLink = metadataPayload.tickTick.originalLink
		const title = deriveTickTickTitle(metadataPayload.tickTick.title, originalLink, taskSections.scrapedSection)
		const content = buildTickTickContent(
			originalLink,
			taskSections.scrapedSection,
			metadataPayload.tickTick.content,
			metadataPayload.tickTick.description,
		)

		return localReferenceTaskSchema.parse({
			filePath,
			originalLink,
			title,
			content,
			description: metadataPayload.tickTick.description,
		})
	})
}

function getActiveUser(database: Database) {
	//
	const row = database
		.query(`
			SELECT
				COALESCE(ZACCESSTOKEN, '') AS accessToken,
				COALESCE(ZCLIENTID, '') AS clientId
			FROM ZTTUSER
			WHERE ZACTIVE = 1
			ORDER BY ZLASTLOGINDATE DESC
			LIMIT 1
		`)
		.get()

	return userRowSchema.parse(row)
}

function getProjectByName(database: Database, projectName: string) {
	//
	const row = database
		.query(`
			SELECT
				COALESCE(ZENTITYID, '') AS projectId,
				COALESCE(ZNAME, '') AS projectName
			FROM ZTTPROJECT
			WHERE lower(COALESCE(ZNAME, '')) = ?
			ORDER BY ZLASTMODIFIEDDATE DESC
			LIMIT 1
		`)
		.get(projectName.toLowerCase())

	return projectRowSchema.parse(row)
}

function getExistingProjectTasks(database: Database, projectId: string) {
	//
	const rows = database
		.query(`
			SELECT
				COALESCE(ZENTITYID, '') AS taskId,
				COALESCE(ZTITLE, '') AS title,
				COALESCE(ZCONTENT, '') AS content,
				COALESCE(ZDEZCRIPTION, '') AS description
			FROM ZTTTASK
			WHERE ZPROJECTID = ?
				AND ZSTATUS = 0
		`)
		.all(projectId)

	return existingTaskRowSchema.array().parse(rows)
}

function createApiHeaders(user: UserRow) {
	//
	return {
		Cookie: `t=${user.accessToken}`,
		'X-Device': user.clientId,
		'Content-Type': 'application/json',
	}
}

function existingTaskContainsLink(task: ExistingTaskRow, link: string) {
	//
	return task.title.includes(link) || task.content.includes(link) || task.description.includes(link)
}

function findProbeTask(existingTasks: ExistingTaskRow[]) {
	//
	return existingTasks.find((task) => task.title === probeTitle) ?? null
}

async function createTickTickTask(user: UserRow, projectId: string, task: LocalReferenceTask) {
	//
	const response = await fetch(`${tickTickApiBaseUrl}/task`, {
		method: 'POST',
		headers: createApiHeaders(user),
		body: JSON.stringify({
			projectId,
			title: task.title,
			content: task.content,
			desc: task.description,
		}),
	})

	const responseText = await response.text()
	if (!response.ok) {
		throw new Error(`Failed to create task for ${task.originalLink}: ${response.status} ${responseText.slice(0, 400)}`)
	}

	const createdTaskIdMatch = responseText.match(/"id":"([^"]+)"/)
	if (!createdTaskIdMatch) {
		throw new Error(`Could not parse created task id for ${task.originalLink}`)
	}

	return summaryRowSchema.parse({
		action: 'created',
		filePath: task.filePath,
		originalLink: task.originalLink,
		title: task.title,
		taskId: createdTaskIdMatch[1] ?? '',
	})
}

async function updateTickTickTask(user: UserRow, projectId: string, taskId: string, task: LocalReferenceTask) {
	//
	const response = await fetch(`${tickTickApiBaseUrl}/task/${taskId}`, {
		method: 'PUT',
		headers: createApiHeaders(user),
		body: JSON.stringify({
			id: taskId,
			projectId,
			title: task.title,
			content: task.content,
			desc: task.description,
		}),
	})

	const responseText = await response.text()
	if (!response.ok) {
		throw new Error(`Failed to update task for ${task.originalLink}: ${response.status} ${responseText.slice(0, 400)}`)
	}

	return summaryRowSchema.parse({
		action: 'created',
		filePath: task.filePath,
		originalLink: task.originalLink,
		title: task.title,
		taskId,
	})
}

async function main() {
	//
	const parsedArgs = parseArgs(process.argv.slice(2))
	const database = new Database(tickTickDbPath, { readonly: true })

	try {
		const user = getActiveUser(database)
		const referencesProject = getProjectByName(database, referencesProjectName)
		const localReferenceTasks = loadLocalReferenceTasks(referencesDir)
		const existingTasks = getExistingProjectTasks(database, referencesProject.projectId)
		const summaryRows: SummaryRow[] = []
		const probeTask = findProbeTask(existingTasks)
		const projectTasksWithoutProbe = existingTasks.filter((task) => task.title !== probeTitle)
		let hasReusedProbeTask = false

		for (const task of localReferenceTasks) {
			const existingTask = projectTasksWithoutProbe.find((projectTask) =>
				existingTaskContainsLink(projectTask, task.originalLink),
			)

			if (existingTask) {
				summaryRows.push(
					summaryRowSchema.parse({
						action: 'kept',
						filePath: task.filePath,
						originalLink: task.originalLink,
						title: existingTask.title,
						taskId: existingTask.taskId,
					}),
				)
				continue
			}

			const createdSummary =
				probeTask && !hasReusedProbeTask
					? await updateTickTickTask(user, referencesProject.projectId, probeTask.taskId, task)
					: await createTickTickTask(user, referencesProject.projectId, task)

			hasReusedProbeTask = hasReusedProbeTask || probeTask?.taskId === createdSummary.taskId
			summaryRows.push(createdSummary)
		}

		writeFileSync(parsedArgs.summaryFile, JSON.stringify(summaryRows, null, 2), 'utf-8')
		console.info(`references sync complete: ${summaryRows.filter((row) => row.action === 'created').length} created, ${summaryRows.filter((row) => row.action === 'kept').length} kept`)
		console.info(`summary saved to ${parsedArgs.summaryFile}`)
	} finally {
		database.close()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})

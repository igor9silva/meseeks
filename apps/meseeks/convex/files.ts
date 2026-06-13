import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, internalQuery, mutation, query } from 'lib/convex';
import {
	getDirectoryTree,
	getFile as getFileHelper,
	getFileByPath as getFileByPathHelper,
	getFileContent as getFileContentHelper,
	getFileContentType,
	getNavigationContext as getNavigationContextHelper,
	getRootDirectory as getRootDirectoryHelper,
	getRouteConventionState as getRouteConventionStateHelper,
	getRouteConventionStorageEntries,
	getRoutePage as getRoutePageHelper,
	listActionsForFile as listActionsForFileHelper,
	listChildren as listChildrenHelper,
	listRevisions as listRevisionsHelper,
	listTags as listTagsHelper,
	resolveActionDirectory,
} from './fileReads.private';
import { createTask, createTriggerFile, seedRouteConventions, writeActionResultFile } from './fileConventions.private';
import {
	createFileWithChangeset,
	ensureFolderWithChangeset,
	ensureRootDirectory as ensureRootDirectoryHelper,
	tagFile,
	updateFileMetadata,
	writeFile,
} from './files.private';

export const ensureRootDirectory = mutation({
	args: {},
	handler: ensureRootDirectoryHelper,
});

export const getRootDirectory = query({
	args: {},
	handler: getRootDirectoryHelper,
});

export const getRouteConventionState = query({
	args: {
		directory: zid('files'),
	},
	handler: getRouteConventionStateHelper,
});

export const getRoutePage = query({
	args: {
		path: z.string().min(1),
	},
	handler: getRoutePageHelper,
});

export const listChildren = query({
	args: {
		parent: zid('files'),
	},
	handler: listChildrenHelper,
});

export const getNavigationContext = query({
	args: {
		path: z.string().min(1),
	},
	handler: getNavigationContextHelper,
});

export const getFile = query({
	args: {
		file: zid('files'),
	},
	handler: getFileHelper,
});

export const getFileByPath = query({
	args: {
		path: z.string().min(1),
	},
	handler: getFileByPathHelper,
});

export const getFileContent = query({
	args: {
		file: zid('files'),
	},
	handler: getFileContentHelper,
});

export const listRevisions = query({
	args: {
		file: zid('files'),
	},
	handler: listRevisionsHelper,
});

export const listTags = query({
	args: {
		file: zid('files'),
	},
	handler: listTagsHelper,
});

export const listActionsForFile = query({
	args: {
		file: zid('files'),
	},
	handler: listActionsForFileHelper,
});

// called by reactor create to record folder mutations on the causing action.
export const _ensureFolder = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		parent: zid('files'),
		name: z.string().min(1),
		action: zid('actions'),
	},
	handler: ensureFolderWithChangeset,
});

// called by reactor create and execute sync to create revisioned files.
export const _createFile = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		parent: zid('files'),
		name: z.string().min(1),
		content: z.string().default(''),
		storageKey: z.string().min(1),
		contentType: z.string().optional(),
		action: zid('actions'),
	},
	handler: createFileWithChangeset,
});

// called by reactor createTask to create the canonical task directory convention.
export const _createTask = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		name: z.string().min(1),
		body: z.string().default(''),
		bodyStorageKey: z.string().min(1),
		summary: z.string().optional(),
		summaryStorageKey: z.string().min(1).optional(),
		title: z.string().optional(),
		settingsStorageKey: z.string().min(1),
		inbox: z.boolean().optional(),
		budget: z.number().nonnegative().optional(),
		availableSkillKeys: z.array(z.string().min(1)).optional(),
		tags: z.record(z.string()).optional(),
		action: zid('actions'),
	},
	handler: createTask,
});

// called by reactor createTriggerExample to create .pro/triggers files as ledgered files.
export const _createTriggerFile = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		name: z.string().min(1),
		content: z.string(),
		storageKey: z.string().min(1),
		action: zid('actions'),
	},
	handler: createTriggerFile,
});

// called by reactor seedRouteConventions to create user-owned route page files.
export const _seedRouteConventions = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		action: zid('actions'),
		entries: z.array(
			z.object({
				path: z.string().min(1),
				content: z.string(),
				storageKey: z.string().min(1),
				contentType: z.string().min(1),
			}),
		),
	},
	handler: seedRouteConventions,
});

// called by reactor write and execute sync to create immutable revisions.
export const _writeFile = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		file: zid('files'),
		content: z.string(),
		storageKey: z.string().min(1),
		contentType: z.string().optional(),
		action: zid('actions'),
	},
	handler: writeFile,
});

// called by reactor updateFileMetadata so metadata-only changes stay ledgered.
export const _updateFileMetadata = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		file: zid('files'),
		action: zid('actions'),
		metadata: z.record(z.string()),
	},
	handler: updateFileMetadata,
});

// called by reactor tag to persist file tags through the normal action ledger.
export const _tagFile = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		file: zid('files'),
		key: z.string().min(1),
		value: z.string().optional(),
		action: zid('actions'),
	},
	handler: tagFile,
});

// called by reactor settleAction to persist the primary .mdx action result.
export const _writeActionResultFile = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		action: zid('actions'),
		name: z.string().min(1),
		content: z.string(),
		storageKey: z.string().min(1),
		contentType: z.string().optional(),
	},
	handler: writeActionResultFile,
});

// called by reactor execute before materializing a box filesystem tree.
export const _getDirectoryTree = internalQuery({
	args: {
		owner: zid('users'),
		directory: zid('files'),
	},
	handler: getDirectoryTree,
});

// called by reactor actions to normalize action directories.
export const _resolveActionDirectory = internalQuery({
	args: {
		owner: zid('users'),
		directory: zid('files').optional(),
	},
	handler: resolveActionDirectory,
});

// called by reactor writes to preserve the file content type when replacing a body.
export const _getFileContentType = internalQuery({
	args: {
		owner: zid('users'),
		file: zid('files'),
	},
	handler: getFileContentType,
});

// called by reactor seedRouteConventions before writing seeded route files.
export const _getRouteConventionStorageEntries = internalQuery({
	args: {
		owner: zid('users'),
		directory: zid('files'),
	},
	handler: getRouteConventionStorageEntries,
});

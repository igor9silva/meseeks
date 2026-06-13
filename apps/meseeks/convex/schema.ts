import { zodToConvex } from 'convex-helpers/server/zod3';
import { defineSchema, defineTable } from 'convex/server';
import { polarEventSchema } from 'schemas/polarEventSchema';
import {
	actionDetailSchema,
	actionSchema,
	boxSchema,
	changesetSchema,
	fileRevisionSchema,
	fileSchema,
	fileTagSchema,
	triggerSchema,
} from 'schemas/workspaceSchema';
import { skillSchema } from 'schemas/skillSchema';
import { topUpSchema } from 'schemas/topUpSchema';
import { transactionSchema } from 'schemas/transactionSchema';
import { userPreferencesSchema, userRequestSchema, userSchema } from 'schemas/userSchema';

// oxfmt-ignore
export default defineSchema({

	users: defineTable(
		zodToConvex(userSchema),
	).index(
		'authUserId', ['authUserId'],
	).index(
		'email', ['email'],
	).index(
		'phone', ['phone'],
	).index(
		'walletAddress_chain', ['walletAddress', 'walletChain'],
	),

	user_preferences: defineTable(
		zodToConvex(userPreferencesSchema),
	).index(
		'by_owner_key', ['owner', 'key'],
	),

	user_requests: defineTable(
		zodToConvex(userRequestSchema),
	).index(
		'by_owner_key', ['owner', 'key'],
	),

	files: defineTable(
		zodToConvex(fileSchema),
	).index(
		'by_owner_parent_isDeleted', ['owner', 'parent', 'isDeleted'],
	).index(
		'by_owner_parent_name', ['owner', 'parent', 'name'],
	).index(
		'by_owner_path', ['owner', 'path'],
	),

	file_tags: defineTable(
		zodToConvex(fileTagSchema),
	).index(
		'by_file_key', ['file', 'key'],
	).index(
		'by_owner_key_value', ['owner', 'key', 'value'],
	),

	file_revisions: defineTable(
		zodToConvex(fileRevisionSchema),
	).index(
		'by_file', ['file'],
	).index(
		'by_directory', ['directory'],
	),

	changesets: defineTable(
		zodToConvex(changesetSchema),
	).index(
		'by_directory', ['directory'],
	).index(
		'by_action', ['action'],
	),

	actions: defineTable(
		zodToConvex(actionSchema),
	).index(
		'by_directory', ['directory'],
	).index(
		'by_directory_status', ['directory', 'status'],
	).index(
		'by_directory_index', ['directory', 'index'],
	),

	action_details: defineTable(
		zodToConvex(actionDetailSchema),
	).index(
		'by_action', ['action'],
	),

	triggers: defineTable(
		zodToConvex(triggerSchema),
	).index(
		'by_directory', ['directory'],
	).index(
		'by_sourceFile', ['sourceFile'],
	),

	boxes: defineTable(
		zodToConvex(boxSchema),
	).index(
		'by_directory', ['directory'],
	).index(
		'by_providerSandboxId', ['providerSandboxId'],
	),

	skills: defineTable(
		zodToConvex(skillSchema),
	).index(
		'by_owner_kind', ['owner', 'kind'],
	).index(
		'by_owner_key', ['owner', 'key'],
	),

	transactions: defineTable(
		zodToConvex(transactionSchema),
	).index(
		'by_owner', ['owner'],
	).searchIndex(
		'search_transactions', {
			searchField: 'description',
			filterFields: ['owner', 'kind'],
		}
	),

	topUps: defineTable(
		zodToConvex(topUpSchema),
	).index(
		'by_status_owner', ['status', 'owner'],
	).index(
		'by_paymentId', ['paymentId'],
	),

	polarEvents: defineTable(
		zodToConvex(polarEventSchema),
	),
});

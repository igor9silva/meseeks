import { zodToConvex } from 'convex-helpers/server/zod3';
import { defineSchema, defineTable } from 'convex/server';
import { actionDetailSchema } from 'schemas/actionDetailSchema';
import { actionSchema } from 'schemas/actionSchema';
import { draftSchema } from 'schemas/draftSchema';
import { endpointSchema } from 'schemas/endpointSchema';
import { fileContentSchema, fileSchema } from 'schemas/fileSchema';
import { fileLinkSchema } from 'schemas/fileLinkSchema';
import { fileTagSchema } from 'schemas/fileTagSchema';
import { indexSchema } from 'schemas/indexSchema';
import { loopSchema } from 'schemas/loopSchema';
import { polarEventSchema } from 'schemas/polarEventSchema';
import { readSchema } from 'schemas/readSchema';
import { routeSchema } from 'schemas/routeSchema';
import { skillSchema } from 'schemas/skillSchema';
import { subscriptionSchema } from 'schemas/subscriptionSchema';
import { topUpSchema } from 'schemas/topUpSchema';
import { transactionSchema } from 'schemas/transactionSchema';
import { triggerSchema } from 'schemas/triggerSchema';
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

	drafts: defineTable(
		zodToConvex(draftSchema),
	).index(
		'by_owner_fileId', ['owner', 'fileId'],
	),

	files: defineTable(
		zodToConvex(fileSchema),
	).index(
		'by_owner_parent_name', ['owner', 'parent', 'name'],
	).index(
		'by_parent', ['parent'],
	).index(
		'by_owner', ['owner'],
	),

	file_contents: defineTable(
		zodToConvex(fileContentSchema),
	).index(
		'by_file', ['file'],
	).index(
		'by_owner_file', ['owner', 'file'],
	),

	file_tags: defineTable(
		zodToConvex(fileTagSchema),
	).index(
		'by_file_key', ['file', 'key'],
	).index(
		'by_owner_key_value', ['owner', 'key', 'value'],
	).index(
		'by_owner_key', ['owner', 'key'],
	).index(
		'by_file', ['file'],
	),

	file_links: defineTable(
		zodToConvex(fileLinkSchema),
	).index(
		'by_from_kind', ['from', 'kind'],
	).index(
		'by_to_kind', ['to', 'kind'],
	).index(
		'by_owner_kind', ['owner', 'kind'],
	),

	skills: defineTable(
		zodToConvex(skillSchema),
	).index(
		'by_owner_key', ['owner', 'key'],
	).index(
		'by_owner_public_key', ['owner', 'isPublic', 'key'],
	).index(
		'by_public_key', ['isPublic', 'key'],
	).index(
		'by_owner_kind', ['owner', 'kind'],
	).index(
		'by_file', ['file'],
	).index(
		'by_source_owner_key', ['sourceOwner', 'sourceKey'],
	),

	actions: defineTable(
		zodToConvex(actionSchema),
	).index(
		'by_file_index', ['file', 'index'],
	).index(
		'by_file_status', ['file', 'status'],
	).index(
		'by_file_spark', ['file', 'spark'],
	).index(
		'by_status', ['status'],
	).index(
		'by_author', ['author'],
	),

	action_details: defineTable(
		zodToConvex(actionDetailSchema),
	).index(
		'by_action', ['action'],
	).index(
		'by_skill', ['skill'],
	).index(
		'by_loop', ['loop'],
	),

	triggers: defineTable(
		zodToConvex(triggerSchema),
	).index(
		'by_file', ['file'],
	).index(
		'by_loop', ['loop'],
	).index(
		'by_author', ['author'],
	).index(
		'by_handler', ['handler'],
	),

	loops: defineTable(
		zodToConvex(loopSchema),
	).index(
		'by_owner_key', ['owner', 'key'],
	).index(
		'by_owner_public_key', ['owner', 'isPublic', 'key'],
	).index(
		'by_public_key', ['isPublic', 'key'],
	).index(
		'by_source_owner_key', ['sourceOwner', 'sourceKey'],
	),

	endpoints: defineTable(
		zodToConvex(endpointSchema),
	).index(
		'by_slugHash', ['slugHash'],
	).index(
		'by_owner_file', ['owner', 'file'],
	).index(
		'by_file_active', ['file', 'isActive'],
	),

	reads: defineTable(
		zodToConvex(readSchema),
	).index(
		'by_user_file', ['user', 'file'],
	).index(
		'by_file', ['file'],
	),

	routes: defineTable(
		zodToConvex(routeSchema),
	).index(
		'by_owner_slug', ['owner', 'slug'],
	).index(
		'by_owner_public_slug', ['owner', 'isPublic', 'slug'],
	).index(
		'by_public_slug', ['isPublic', 'slug'],
	).index(
		'by_file', ['file'],
	),

	indexes: defineTable(
		zodToConvex(indexSchema),
	).index(
		'by_file_kind', ['file', 'kind'],
	).index(
		'by_owner_file', ['owner', 'file'],
	).index(
		'by_owner_kind_status', ['owner', 'kind', 'status'],
	),

	transactions: defineTable(
		zodToConvex(transactionSchema),
	).index(
		'by_owner', ['owner'],
	).index(
		'by_file', ['file'],
	).index(
		'by_action', ['action'],
	),

	subscriptions: defineTable(
		zodToConvex(subscriptionSchema),
	).index(
		'by_owner_status', ['owner', 'status'],
	).index(
		'by_paymentId', ['paymentId'],
	).index(
		'by_polarSubscriptionId', ['polarSubscriptionId'],
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

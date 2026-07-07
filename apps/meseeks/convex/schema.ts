import { zodToConvex } from 'convex-helpers/server/zod3';
import { defineSchema, defineTable } from 'convex/server';
import { actionDetailSchema } from 'schemas/actionDetailSchema';
import { actionSchema } from 'schemas/actionSchema';
import { boxSchema } from 'schemas/boxSchema';
import { fileRevisionSchema } from 'schemas/fileRevisionSchema';
import { fileSchema, fileTagSchema } from 'schemas/fileSchema';
import { pageSchema } from 'schemas/pageSchema';
import { polarEventReceiptSchema } from 'schemas/polarEventSchema';
import { skillSchema } from 'schemas/skillSchema';
import { topUpSchema } from 'schemas/topUpSchema';
import { transactionSchema } from 'schemas/transactionSchema';
import { triggerSchema } from 'schemas/triggerSchema';
import { userRequestSchema, userSchema } from 'schemas/userSchema';

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
	),

	user_requests: defineTable(
		zodToConvex(userRequestSchema),
	).index(
		'by_owner_key', ['owner', 'key'],
	),

	files: defineTable(
		zodToConvex(fileSchema),
	).index(
		'by_owner_parent_name', ['owner', 'parent', 'name'],
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
		'by_file_previousRevision', ['file', 'previousRevision'],
	).index(
		'by_action', ['action'],
	).index(
		'by_owner_file', ['owner', 'file'],
	),

	actions: defineTable(
		zodToConvex(actionSchema),
	).index(
		'by_root_index', ['root', 'index'],
	).index(
		'by_root_status', ['root', 'status'],
	).index(
		'by_owner_root', ['owner', 'root'],
	).index(
		'by_author', ['author'],
	).index(
		'by_spark', ['spark'],
	).index(
		'by_status', ['status'],
	),

	action_details: defineTable(
		zodToConvex(actionDetailSchema),
	).index(
		'by_action', ['action'],
	).index(
		'by_owner_action', ['owner', 'action'],
	).index(
		'by_kind', ['kind'],
	),

	triggers: defineTable(
		zodToConvex(triggerSchema),
	).index(
		'by_root_kind_status', ['root', 'kind', 'status'],
	).index(
		'by_owner_root', ['owner', 'root'],
	).index(
		'by_nextRunAt', ['nextRunAt'],
	).index(
		'by_author', ['author'],
	),

	boxes: defineTable(
		zodToConvex(boxSchema),
	).index(
		'by_root_status', ['root', 'status'],
	).index(
		'by_owner_root', ['owner', 'root'],
	).index(
		'by_providerBoxId', ['providerBoxId'],
	),

	transactions: defineTable(
		zodToConvex(transactionSchema),
	).index(
		'by_owner', ['owner'],
	).index(
		'by_action', ['action'],
	).index(
		'by_file', ['file'],
	).index(
		'by_topUp', ['topUp'],
	),

	skills: defineTable(
		zodToConvex(skillSchema),
	).index(
		'by_owner_kind', ['owner', 'kind'],
	).index(
		'by_owner_key', ['owner', 'key'],
	).index(
		'by_owner_root_key', ['owner', 'root', 'key'],
	),

	pages: defineTable(
		zodToConvex(pageSchema),
	).index(
		'by_owner_root_route', ['owner', 'root', 'route'],
	).index(
		'by_file', ['file'],
	),

	top_ups: defineTable(
		zodToConvex(topUpSchema),
	).index(
		'by_status_owner', ['status', 'owner'],
	).index(
		'by_paymentId', ['paymentId'],
	),

	polar_events: defineTable(
		zodToConvex(polarEventReceiptSchema),
	).index(
		'by_eventId', ['eventId'],
	).index(
		'by_owner', ['owner'],
	).index(
		'by_action', ['action'],
	),
});

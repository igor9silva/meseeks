import { authTables } from '@convex-dev/auth/server';
import { zodToConvex } from 'convex-helpers/server/zod';
import { defineSchema, defineTable } from 'convex/server';
import { actionDetailSchema } from './schemas/actionDetailSchema';
import { actionSchema } from './schemas/actionSchema';
import { componentSchema } from './schemas/componentSchema';
import { polarEventSchema } from './schemas/polarEventSchema';
import { scheduleSchema } from './schemas/scheduleSchema';
import { skillSchema } from './schemas/skillSchema';
import { subscriptionSchema } from './schemas/subscriptionSchema';
import { taskSchema } from './schemas/taskSchema';
import { topUpSchema } from './schemas/topUpSchema';
import { transactionSchema } from './schemas/transactionSchema';
import { userPreferencesSchema, userRequestSchema, userSchema } from './schemas/userSchema';

// prettier-ignore
export default defineSchema({

	...authTables,

	users: defineTable(
		zodToConvex(userSchema),
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

	tasks: defineTable(
		zodToConvex(taskSchema),
	).index(
		'by_owner_parentId_isActive', ['owner', 'parentId', 'isActive'],
	).index(
		'by_parent_isActive', ['parentId', 'isActive'],
	).index(
		'by_owner_isActive', ['owner', 'isActive'],
	).index(
		'by_owner_status', ['owner', 'status'],
	).index(
		'by_owner_energyAvailable', ['owner', 'energyBudget.available'],
	),
	// .index(
	// 	'by_embeddingId', ['embeddingId'],
	// ),

	// taskEmbeddings: defineTable(
	// 	zodToConvex(taskEmbeddingsSchema),
	// ).vectorIndex("by_embedding", {
	// 	dimensions: 3072,
	// 	vectorField: 'embedding',
	// 	filterFields: ['isDone'],
	// }),
	
	actions: defineTable(
		zodToConvex(actionSchema),
	).index(
		'by_task', ['taskId'],
	).index(
		'by_task_status', ['taskId', 'status'],
	).index(
		'by_task_author_status', ['taskId', 'author', 'status'],
	).index(
		'by_status', ['status'],
	),

	action_details: defineTable(
		zodToConvex(actionDetailSchema),
	).index(
		'by_action', ['actionId'],
	),

	schedules: defineTable(
		zodToConvex(scheduleSchema),
	).index(
		'by_task', ['taskId'],
	).index(
		'by_owner', ['owner'],
	),

	skills: defineTable(
		zodToConvex(skillSchema),
	).index(
		'by_owner_kind', ['owner', 'kind'],
	).index(
		'by_owner_key', ['owner', 'key'],
	),

	components: defineTable(
		zodToConvex(componentSchema),
	).index(
		'by_owner_slug', ['owner', 'slug'],
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

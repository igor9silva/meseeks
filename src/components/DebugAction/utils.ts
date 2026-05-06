import type { Doc } from 'convex/_generated/dataModel';

export function copyToClipboard(text: string) {
	//
	navigator.clipboard.writeText(text);
}

// format date for debug copy/paste
export function formatLocalTimestamp(timestamp: number) {
	//
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		fractionalSecondDigits: 3,
		timeZoneName: 'shortOffset',
	}).format(new Date(timestamp));
}

export function getStatusDot(status: string) {
	//
	const statusMap: Record<string, string> = {
		'succeeded': 'bg-green-500',
		'failed': 'bg-red-500',
		'running': 'bg-blue-500',
		'skipped': 'bg-gray-500',
		'blocked': 'bg-yellow-500',
	};

	return statusMap[status] || 'bg-gray-500';
}

export function serializeActionToJSON(action: Doc<'actions'>, actionDetails?: Doc<'action_details'> | null) {
	//
	const costs = 'costs' in action ? action.costs : undefined;
	const serializable = {
		...action,
		// convert bigint values to strings for JSON serialization
		estimatedCost: action.estimatedCost ? action.estimatedCost.toString() : null,
		maxCost: action.maxCost ? action.maxCost.toString() : null,
		reservedEnergy: action.reservedEnergy ? action.reservedEnergy.toString() : null,
		costs: costs?.map((cost) => ({
			...cost,
			amount: cost.amount.toString(),
		})),
		// add action details if available
		details: actionDetails || null,
	};

	return JSON.stringify(serializable, null, 2);
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

export function formatDistanceToNow(
	date: Date | number,
	options: {
		addSuffix?: boolean;
		now?: Date | number;
	} = {},
): string {
	//
	const target = toDate(date);
	const now = toDate(options.now ?? Date.now());
	const distance = formatDistance(Math.abs(target.getTime() - now.getTime()));

	if (!options.addSuffix) return distance;
	if (target.getTime() < now.getTime()) return `${distance} ago`;
	return `in ${distance}`;
}

function formatDistance(distanceMs: number): string {
	//
	if (distanceMs < 30 * SECOND_MS) return 'less than a minute';
	if (distanceMs < 90 * SECOND_MS) return '1 minute';
	if (distanceMs < 45 * MINUTE_MS) return `${Math.round(distanceMs / MINUTE_MS)} minutes`;
	if (distanceMs < 90 * MINUTE_MS) return 'about 1 hour';
	if (distanceMs < 22 * HOUR_MS) return `about ${Math.round(distanceMs / HOUR_MS)} hours`;
	if (distanceMs < 36 * HOUR_MS) return '1 day';
	if (distanceMs < 25 * DAY_MS) return `${Math.round(distanceMs / DAY_MS)} days`;
	if (distanceMs < 45 * DAY_MS) return 'about 1 month';
	if (distanceMs < 345 * DAY_MS) return `${Math.round(distanceMs / MONTH_MS)} months`;
	if (distanceMs < 545 * DAY_MS) return 'about 1 year';
	return `${Math.round(distanceMs / YEAR_MS)} years`;
}

function toDate(value: Date | number): Date {
	//
	return value instanceof Date ? value : new Date(value);
}

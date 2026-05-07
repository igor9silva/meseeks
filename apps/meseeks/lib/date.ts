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

export function formatScheduledTime(date: Date, timeZone: string, now = new Date()): string {
	//
	const time = formatTime(date, timeZone);
	const offset = formatUtcOffset(date, timeZone);

	if (isDateInTimezone(date, now, timeZone)) {
		return `today at ${time} (UTC${offset})`;
	}

	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	if (isDateInTimezone(date, tomorrow, timeZone)) {
		return `tomorrow at ${time} (UTC${offset})`;
	}

	return `at ${formatDateTime(date, timeZone)} (UTC${offset})`;
}

export function formatTime(date: Date, timeZone: string): string {
	//
	return date.toLocaleString('en-US', {
		timeZone,
		hour: 'numeric',
		minute: '2-digit',
		hour12: false,
	});
}

export function formatDateTime(date: Date, timeZone: string): string {
	//
	const parts = getDateTimeParts(date, timeZone);
	return `${parts.month} ${parts.day}, ${parts.hour}:${parts.minute}`;
}

export function isDateInTimezone(date1: Date, date2: Date, timeZone: string): boolean {
	//
	return getDateKey(date1, timeZone) === getDateKey(date2, timeZone);
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

function getDateTimeParts(date: Date, timeZone: string) {
	//
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: false,
	})
		.formatToParts(date)
		.reduce<Record<string, string>>((result, part) => {
			if (part.type !== 'literal') result[part.type] = part.value;
			return result;
		}, {});

	return {
		month: parts['month'] ?? '',
		day: parts['day'] ?? '',
		hour: parts['hour'] ?? '',
		minute: parts['minute'] ?? '',
	};
}

function formatUtcOffset(date: Date, timeZone: string): string {
	//
	const offsetMatch = date
		.toLocaleString('en-US', {
			timeZone,
			timeZoneName: 'longOffset',
		})
		.match(/GMT([+-])0?(\d+)(?::(\d{2}))?/);

	if (!offsetMatch) return '+0';

	const [, sign, hour, minute] = offsetMatch;
	return minute && minute !== '00' ? `${sign}${hour}:${minute}` : `${sign}${hour}`;
}

function getDateKey(date: Date, timeZone: string): string {
	//
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);
}

function toDate(value: Date | number): Date {
	//
	return value instanceof Date ? value : new Date(value);
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const RELATIVE_LIMIT_MS = 6 * HOUR_MS;
const TIME_ONLY_LIMIT_MS = DAY_MS;
const DAYS_LIMIT = 30;
const MONTHS_LIMIT = 36;

export function formatFileItemTimestamp(
	dateInput: number | Date,
	options: {
		now?: number | Date;
		locale?: string | string[];
	} = {},
) {
	//
	const date = toDate(dateInput);
	const now = toDate(options.now ?? new Date());
	const elapsedMs = Math.max(0, now.getTime() - date.getTime());

	if (elapsedMs <= RELATIVE_LIMIT_MS) return formatRecentRelative(elapsedMs);
	if (elapsedMs < TIME_ONLY_LIMIT_MS) return formatTime(date, options.locale);

	if (isYesterday(date, now)) return `Yesterday, ${formatTime(date, options.locale)}`;

	const elapsedDays = differenceInCalendarDays(date, now);
	if (elapsedDays <= DAYS_LIMIT) return `${elapsedDays}d ago, ${formatTime(date, options.locale)}`;

	const months = differenceInCompleteMonths(date, now);
	if (months < 3) {
		const weeks = Math.floor(elapsedDays / 7);
		return formatApproximateUnit(weeks, 'w', elapsedDays % 7 === 0);
	}

	if (months < MONTHS_LIMIT) {
		return formatApproximateUnit(months, 'mo', isExactMonthDifference(date, now, months));
	}

	const years = Math.floor(months / 12);
	return formatApproximateUnit(years, 'y', isExactYearDifference(date, now, years));
}

export function formatFileItemTimestampTooltip(dateInput: number | Date) {
	//
	return toDate(dateInput).toISOString();
}

function formatRecentRelative(elapsedMs: number) {
	//
	const minutes = Math.floor(elapsedMs / MINUTE_MS);
	if (minutes < 1) return 'now';
	if (minutes < 60) return `${minutes}min ago`;

	const hours = Math.floor(elapsedMs / HOUR_MS);
	return `${hours}h ago`;
}

function formatTime(date: Date, locale: string | string[] | undefined) {
	//
	const systemFormat = new Intl.DateTimeFormat(locale, {
		hour: 'numeric',
		minute: '2-digit',
	});
	const hour = systemFormat.resolvedOptions().hour12 ? 'numeric' : '2-digit';

	return new Intl.DateTimeFormat(locale, {
		hour,
		minute: '2-digit',
	}).format(date);
}

function formatApproximateUnit(value: number, unit: string, isExact: boolean) {
	//
	return `${value}${unit}${isExact ? '' : '+'} ago`;
}

function isYesterday(date: Date, now: Date) {
	//
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);

	return (
		date.getFullYear() === yesterday.getFullYear() &&
		date.getMonth() === yesterday.getMonth() &&
		date.getDate() === yesterday.getDate()
	);
}

function differenceInCompleteMonths(date: Date, now: Date) {
	//
	const monthDelta = (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
	return isExactMonthDifference(date, now, monthDelta) || shiftedDateIsBefore(date, now, monthDelta)
		? monthDelta
		: monthDelta - 1;
}

function differenceInCalendarDays(date: Date, now: Date) {
	//
	return Math.floor((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS);
}

function isExactMonthDifference(date: Date, now: Date, months: number) {
	//
	const shifted = addMonths(date, months);
	return shifted.getTime() === now.getTime();
}

function isExactYearDifference(date: Date, now: Date, years: number) {
	//
	const shifted = addYears(date, years);
	return shifted.getTime() === now.getTime();
}

function shiftedDateIsBefore(date: Date, now: Date, months: number) {
	//
	return addMonths(date, months).getTime() < now.getTime();
}

function addMonths(date: Date, months: number) {
	//
	const shifted = new Date(date);
	shifted.setMonth(date.getMonth() + months);
	return shifted;
}

function addYears(date: Date, years: number) {
	//
	const shifted = new Date(date);
	shifted.setFullYear(date.getFullYear() + years);
	return shifted;
}

function startOfDay(date: Date) {
	//
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);
	return start;
}

function toDate(input: number | Date) {
	//
	return input instanceof Date ? input : new Date(input);
}

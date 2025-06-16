export function formatScheduledTime(date: Date, timeZone: string): string {
	//
	const timeStr = formatTime(date, timeZone);

	if (isDateInTimezone(date, new Date(), timeZone)) {
		return `today at ${timeStr}`;
	}

	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	if (isDateInTimezone(date, tomorrow, timeZone)) {
		return `tomorrow at ${timeStr}`;
	}

	return `at ${formatDateTime(date, timeZone)}`;
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
	return date.toLocaleString('en-US', {
		timeZone,
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: false,
	});
}

export function isDateInTimezone(date1: Date, date2: Date, timeZone: string): boolean {
	//
	const d1InTz = new Date(date1.toLocaleString('en-US', { timeZone }));
	const d2InTz = new Date(date2.toLocaleString('en-US', { timeZone }));

	return d1InTz.toDateString() === d2InTz.toDateString();
}

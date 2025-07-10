export function formatScheduledTime(date: Date, timeZone: string): string {
	//
	const timeStr = formatTime(date, timeZone);

	// Get UTC offset in simple +/-X format
	const offsetMatch = date
		.toLocaleString('en-US', {
			timeZone,
			timeZoneName: 'longOffset',
		})
		.match(/GMT([+-])0?(\d+)/);

	const offsetStr = offsetMatch ? `${offsetMatch[1]}${offsetMatch[2]}` : '+0';

	if (isDateInTimezone(date, new Date(), timeZone)) {
		return `today at ${timeStr} (UTC${offsetStr})`;
	}

	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	if (isDateInTimezone(date, tomorrow, timeZone)) {
		return `tomorrow at ${timeStr} (UTC${offsetStr})`;
	}

	return `at ${formatDateTime(date, timeZone)} (UTC${offsetStr})`;
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

import { CronExpressionParser } from 'cron-parser';

/**
 * Calculate the next run time for a cron expression
 */
export function computeNextRun(
	expression: string, //
	timeZone: string,
	startDate?: Date,
) {
	const interval = CronExpressionParser.parse(expression, {
		tz: timeZone,
		startDate,
	});

	return interval.next().toDate();
}

export function getNextDates(
	expression: string, //
	timeZone: string,
	count: number,
	startDate?: Date,
) {
	//
	const interval = CronExpressionParser.parse(expression, {
		tz: timeZone,
		startDate,
	});

	const dates = [];
	for (let i = 0; i < count; i++) {
		dates.push(interval.next().toDate());
	}

	return dates;
}

/**
 * Validate if a cron expression is valid
 */
export function isExpressionValid(expression: string): boolean {
	//
	try {
		CronExpressionParser.parse(expression);
		return true;
	} catch {
		return false;
	}
}

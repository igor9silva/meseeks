import { appendFileSync, existsSync, readFileSync } from "node:fs";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogEntry = {
	ts: string;
	level: LogLevel;
	event: string;
	data?: Record<string, unknown>;
};

const SENSITIVE_KEY_PATTERN =
	/(?:^|_)(?:TOKEN|SECRET|PASSWORD|PASS|API_KEY|AUTH|COOKIE|SESSION|PRIVATE_KEY|ACCESS_KEY|REFRESH_KEY)(?:$|_)/i;

const INLINE_ENV_SECRET_PATTERN =
	/(\b[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASS|API_KEY|AUTH|COOKIE|SESSION|PRIVATE_KEY|ACCESS_KEY|REFRESH_KEY)[A-Z0-9_]*\b\s*[:=]\s*['"]?)([^'",\s}]+)(['"]?)/g;

const INLINE_TOKEN_PATTERNS = [
	/\bsk-(?:proj|live|test)-[A-Za-z0-9_-]+\b/g,
	/\bgh[pousr]_[A-Za-z0-9_]+\b/g,
];

const sanitizeString = (value: string): string => {
	let sanitized = value.replace(
		INLINE_ENV_SECRET_PATTERN,
		(_match, prefix: string, _secret: string, suffix: string) =>
			`${prefix}[redacted]${suffix}`,
	);

	for (const pattern of INLINE_TOKEN_PATTERNS) {
		sanitized = sanitized.replace(pattern, "[redacted]");
	}

	return sanitized;
};

const sanitizeUnknown = (
	value: unknown,
	parentKey?: string,
	seen = new WeakSet<object>(),
): unknown => {
	if (typeof value === "string") {
		return SENSITIVE_KEY_PATTERN.test(parentKey || "")
			? "[redacted]"
			: sanitizeString(value);
	}

	if (!value || typeof value !== "object") {
		return value;
	}

	if (seen.has(value)) {
		return "[circular]";
	}

	seen.add(value);

	if (Array.isArray(value)) {
		return value.map((entry) => sanitizeUnknown(entry, parentKey, seen));
	}

	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [
			key,
			sanitizeUnknown(entry, key, seen),
		]),
	);
};

export class Logger {
	constructor(
		private readonly logFile: string,
		private readonly devMode: boolean,
	) {}

	debug(event: string, data?: Record<string, unknown>): void {
		this.write("debug", event, data);
	}

	info(event: string, data?: Record<string, unknown>): void {
		this.write("info", event, data);
	}

	warn(event: string, data?: Record<string, unknown>): void {
		this.write("warn", event, data);
	}

	error(event: string, data?: Record<string, unknown>): void {
		this.write("error", event, data);
	}

	getLogFile(): string {
		return this.logFile;
	}

	readTail(maxLines = 80): string {
		if (!existsSync(this.logFile)) {
			return "";
		}

		const lines = readFileSync(this.logFile, "utf8")
			.split("\n")
			.filter(Boolean);

		return lines.slice(-maxLines).join("\n");
	}

	private write(
		level: LogLevel,
		event: string,
		data?: Record<string, unknown>,
	): void {
		const sanitizedData = data
			? (sanitizeUnknown(data) as Record<string, unknown>)
			: undefined;
		const entry: LogEntry = {
			ts: new Date().toISOString(),
			level,
			event,
			data: sanitizedData,
		};
		const line = JSON.stringify(entry);

		appendFileSync(this.logFile, `${line}\n`);

		if (this.devMode || level === "error" || level === "warn") {
			const detail = sanitizedData
				? ` ${JSON.stringify(sanitizedData)}`
				: "";
			const printer = level === "error" ? console.error : console.log;
			printer(`[${level}] ${event}${detail}`);
		}
	}
}

import type { Logger } from "../src/services/logger";

type HealthCheckedProcess = {
	exitCode: number | null;
};

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const waitForHealthyBackend = async (
	healthUrl: string,
	logger: Logger,
	child: HealthCheckedProcess,
	timeoutMs = 60000,
): Promise<void> => {
	const deadline = Date.now() + timeoutMs;

	for (;;) {
		if (child.exitCode !== null) {
			throw new Error(
				`code-server exited before becoming healthy (exit code ${child.exitCode}).`,
			);
		}

		try {
			const response = await fetch(healthUrl, {
				signal: AbortSignal.timeout(1500),
			});

			if (response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					status?: string;
					lastHeartbeat?: number;
				};

				logger.debug("backend.health.poll", {
					healthUrl,
					status: body.status || "unknown",
					lastHeartbeat: body.lastHeartbeat || null,
				});

				if (!body.status || body.status === "alive" || body.status === "expired") {
					return;
				}
			}
		} catch {
			// Poll until ready or timeout.
		}

		if (Date.now() >= deadline) {
			throw new Error(
				`Timed out waiting for code-server health at ${healthUrl}.`,
			);
		}

		await sleep(250);
	}
};

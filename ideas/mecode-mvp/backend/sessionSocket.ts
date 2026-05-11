import http from "node:http";

import type { Logger } from "../src/services/logger";
import type { WorkspaceTarget } from "../src/types";

type OpenRequest = {
	type: "open";
	folderURIs: string[];
	fileURIs: string[];
	forceReuseWindow: boolean;
	forceNewWindow: boolean;
	gotoLineMode: boolean;
};

export const openTargetViaSessionSocket = async (
	sessionSocketPath: string,
	target: WorkspaceTarget,
	logger: Logger,
): Promise<void> => {
	const payload: OpenRequest = {
		type: "open",
		folderURIs: target.kind === "folder" ? [target.path] : [],
		fileURIs: target.kind === "folder" ? [] : [target.path],
		forceReuseWindow: true,
		forceNewWindow: false,
		gotoLineMode: true,
	};

	logger.info("backend.session.open", {
		sessionSocketPath,
		target,
	});

	await new Promise<void>((resolve, reject) => {
		const request = http.request(
			{
				method: "POST",
				path: "/",
				socketPath: sessionSocketPath,
				timeout: 5000,
			},
			(response) => {
				let responseBody = "";
				response.setEncoding("utf8");
				response.on("data", (chunk) => {
					responseBody += chunk;
				});
				response.on("end", () => {
					if (
						response.statusCode &&
						response.statusCode >= 200 &&
						response.statusCode < 300
					) {
						resolve();
						return;
					}

					reject(
						new Error(
							`Session socket open failed with status ${response.statusCode}: ${responseBody.trim()}`,
						),
					);
				});
			},
		);

		request.once("timeout", () => {
			request.destroy(new Error("Session socket open request timed out."));
		});
		request.once("error", reject);
		request.write(JSON.stringify(payload));
		request.end();
	});
};

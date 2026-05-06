import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function findRepoRoot(startDirectory = process.cwd()): string {
	//
	let current = resolve(startDirectory);

	while (true) {
		const hasRootPackage = existsSync(join(current, "package.json"));
		const hasTasksDirectory = existsSync(join(current, "tasks"));

		if (hasRootPackage && hasTasksDirectory) return current;

		const parent = dirname(current);
		if (parent === current) {
			throw new Error(`failed to find repository root from ${startDirectory}`);
		}

		current = parent;
	}
}

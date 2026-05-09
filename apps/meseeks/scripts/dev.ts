import {
	assertAppRoot,
	cleanupGeneratedGitignore,
	getPreviewName,
	isMainBranch,
	loadEnvLocal,
	registerGeneratedGitignoreCleanup,
	run,
	runConvex,
} from './preview-env';

registerGeneratedGitignoreCleanup();

function main() {
	assertAppRoot();

	if (isMainBranch()) {
		run('bunx', ['concurrently', '-r', 'bun:dev:web', 'bun:dev:db']);
		return;
	}

	const previewName = getPreviewName(process.argv.slice(2));
	run('bun', ['./scripts/attach-preview-env.ts', '--branch', previewName]);

	const env = {
		...process.env,
		...Object.fromEntries(loadEnvLocal()),
		VERCEL_ENV: 'preview',
		VERCEL_GIT_COMMIT_REF: previewName,
	};

	try {
		runConvex(['dev', '--env-file', '.env.local', '--start', 'bun run dev:web'], { env });
	} finally {
		cleanupGeneratedGitignore();
	}
}

try {
	main();
} catch (error) {
	cleanupGeneratedGitignore();
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

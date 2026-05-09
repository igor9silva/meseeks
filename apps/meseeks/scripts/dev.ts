import { assertAppRoot, getPreviewName, isMainBranch, loadEnvLocal, run } from './preview-env';

function main() {
	assertAppRoot();

	if (isMainBranch()) {
		run('concurrently', ['-r', 'bun:dev:web', 'bun:dev:db']);
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

	run('convex', ['dev', '--env-file', '.env.local', '--start', 'bun run dev:web'], { env });
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

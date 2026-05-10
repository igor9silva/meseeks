import {
	assertAppRoot,
	assertPreviewDeployment,
	envLocalFile,
	getPreviewName,
	isMainBranch,
	loadEnvLocal,
	previewCommandEnv,
	previewRef,
	run,
	runConvex,
} from './preview-env';

function main() {
	assertAppRoot();

	if (isMainBranch()) {
		run('bunx', ['concurrently', '-r', 'bun:dev:web', 'bun:dev:db']);
		return;
	}

	const previewName = getPreviewName(process.argv.slice(2));
	const deploymentRef = previewRef(previewName);
	run('bun', ['./scripts/attach-preview-env.ts', '--branch', previewName], { env: previewCommandEnv() });

	const entries = loadEnvLocal();
	assertPreviewDeployment(entries, deploymentRef);
	const env = previewCommandEnv(entries);
	env.VERCEL_ENV = 'preview';
	env.VERCEL_GIT_COMMIT_REF = previewName;

	runConvex(['dev', '--env-file', envLocalFile, '--start', 'bun run dev:web'], { env });
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

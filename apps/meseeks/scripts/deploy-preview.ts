import { assertAppRoot, envLocalFile, getPreviewName, loadEnvLocal, run } from './preview-env';

function main() {
	assertAppRoot();

	const entries = loadEnvLocal();
	const previewName = getPreviewName(process.argv.slice(2));
	const env = {
		...process.env,
		...Object.fromEntries(entries),
		VERCEL_ENV: 'preview',
		VERCEL_GIT_COMMIT_REF: previewName,
	};
	const deployKey = env.CONVEX_DEPLOY_KEY;

	if (!deployKey) {
		throw new Error(
			`Missing CONVEX_DEPLOY_KEY. Run bun run preview:attach first so ${envLocalFile} is populated from Vercel preview env.`,
		);
	}

	const args = [
		'convex',
		'deploy',
		'--preview-name',
		previewName,
		'--message',
		`local preview deploy for ${previewName}`,
	];
	const previewRun = env.CONVEX_PREVIEW_RUN;
	if (previewRun) args.push('--preview-run', previewRun);

	run('bunx', args, { env });
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

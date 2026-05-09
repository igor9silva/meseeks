import {
	assertAppRoot,
	ensureConvexClientUrls,
	envLocalFile,
	getPreviewName,
	previewRef,
	readDotenv,
	run,
	tryRun,
	writeDotenv,
} from './preview-env';

const defaultPreviewExpiration = 'in 7 days';

function main() {
	assertAppRoot();

	const previewName = getPreviewName(process.argv.slice(2));
	const deploymentRef = previewRef(previewName);
	const localEntries = readDotenv(envLocalFile);

	console.log(`Preparing local preview env for ${deploymentRef}`);
	const createdDeployment = selectConvexPreviewDeployment(deploymentRef);

	const convexEntries = readDotenv(envLocalFile);
	const merged = new Map([...localEntries, ...convexEntries]);

	merged.set('CONVEX_PREVIEW_NAME', previewName);
	merged.set('CONVEX_PREVIEW_REF', deploymentRef);
	merged.set('VERCEL_ENV', 'preview');
	merged.set('VERCEL_GIT_COMMIT_REF', previewName);
	ensureConvexClientUrls(merged);

	writeDotenv(envLocalFile, merged);

	console.log(`Wrote ${envLocalFile} for ${deploymentRef}`);
	console.log(`VITE_CONVEX_URL=${merged.get('VITE_CONVEX_URL') ?? '<missing>'}`);
	console.log(`VITE_CONVEX_SITE_URL=${merged.get('VITE_CONVEX_SITE_URL') ?? '<missing>'}`);

	if (createdDeployment) bootstrapFreshPreview(merged);
}

function selectConvexPreviewDeployment(deploymentRef: string) {
	console.log(`Selecting Convex deployment ${deploymentRef}`);
	const selected = tryRun('bunx', ['convex', 'deployment', 'select', deploymentRef]);
	if (selected.ok) return false;

	console.log(`Convex deployment ${deploymentRef} was not selectable; creating it.`);
	run('bunx', [
		'convex',
		'deployment',
		'create',
		deploymentRef,
		'--type',
		'preview',
		'--select',
		'--expiration',
		process.env.CONVEX_PREVIEW_EXPIRATION ?? defaultPreviewExpiration,
	]);

	return true;
}

function bootstrapFreshPreview(entries: Map<string, string>) {
	const previewRun = process.env.CONVEX_PREVIEW_RUN ?? entries.get('CONVEX_PREVIEW_RUN');
	if (!previewRun) return;

	const env = { ...process.env, ...Object.fromEntries(entries) };
	console.log(`Fresh preview created; pushing code with Convex dev and running ${previewRun}`);
	run('convex', ['dev', '--once', '--env-file', envLocalFile, '--run', previewRun], { env });
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

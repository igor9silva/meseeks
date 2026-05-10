import {
	assertAppRoot,
	assertPreviewDeployment,
	ensureConvexClientUrls,
	envLocalFile,
	getPreviewName,
	getPreviewRun,
	loadEnvLocal,
	previewCommandEnv,
	previewRef,
	readDotenv,
	removePreviewUnsafeEntries,
	run,
	runConvex,
	runConvexDeploy,
	tryRunConvex,
	writeDotenv,
} from './preview-env';

const convexProjectSelector = 'isPro:meseeks';
const defaultPreviewExpiration = 'in 7 days';

function main() {
	assertAppRoot();

	const args = process.argv.slice(2);
	const shouldStartDevServer = args.includes('--dev');
	const previewName = getPreviewName(args);
	const deploymentRef = previewRef(previewName);
	const createdDeployment = selectPreviewDeployment(deploymentRef);
	const entries = writePreviewEnv(previewName, deploymentRef);
	const env = previewCommandEnv(entries);

	runConvex(['codegen'], { env });

	const deployArgs = ['deploy', '--preview-name', previewName, '--env-file', envLocalFile, '--codegen', 'disable'];
	const previewRun = createdDeployment ? getPreviewRun(entries) : undefined;
	if (previewRun) deployArgs.push('--preview-run', previewRun);

	runConvexDeploy(deployArgs, { env });

	const deployedEntries = loadEnvLocal();
	assertPreviewDeployment(deployedEntries, deploymentRef);
	if (!shouldStartDevServer) return;

	run('bun', ['run', 'dev:web'], { env: previewCommandEnv(deployedEntries) });
}

function selectPreviewDeployment(deploymentRef: string) {
	const deploymentSelector = `${convexProjectSelector}:${deploymentRef}`;
	const env = previewCommandEnv();

	console.log(`Selecting Convex deployment ${deploymentRef}`);
	const selected = tryRunConvex(['deployment', 'select', deploymentSelector], { env });
	if (selected.ok) return false;

	console.log(`Creating Convex deployment ${deploymentRef}`);
	runConvex(
		[
			'deployment',
			'create',
			deploymentSelector,
			'--type',
			'preview',
			'--select',
			'--expiration',
			process.env.CONVEX_PREVIEW_EXPIRATION ?? defaultPreviewExpiration,
		],
		{ env },
	);

	return true;
}

function writePreviewEnv(previewName: string, deploymentRef: string) {
	const localEntries = readDotenv(envLocalFile);
	if (localEntries.has('CONVEX_DEPLOY_KEY')) {
		throw new Error(`Refusing to use ${envLocalFile} for preview because it contains CONVEX_DEPLOY_KEY.`);
	}

	const convexEntries = readDotenv(envLocalFile);
	const entries = new Map([...localEntries, ...convexEntries]);

	entries.set('CONVEX_PREVIEW_NAME', previewName);
	entries.set('CONVEX_PREVIEW_REF', deploymentRef);
	entries.set('VERCEL_ENV', 'preview');
	entries.set('VERCEL_GIT_COMMIT_REF', previewName);
	removePreviewUnsafeEntries(entries);
	ensureConvexClientUrls(entries);
	assertPreviewDeployment(entries, deploymentRef);
	writeDotenv(envLocalFile, entries);

	console.log(`Wrote ${envLocalFile} for ${deploymentRef}`);
	console.log(`VITE_CONVEX_URL=${entries.get('VITE_CONVEX_URL') ?? '<missing>'}`);
	console.log(`VITE_CONVEX_SITE_URL=${entries.get('VITE_CONVEX_SITE_URL') ?? '<missing>'}`);

	return entries;
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

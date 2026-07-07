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
const repoRoot = '../..';
const previewSeededRefKey = 'CONVEX_PREVIEW_SEEDED_REF';

function main() {
	assertAppRoot();
	buildGeneratedConfigs();

	const args = process.argv.slice(2);
	const shouldStartDevServer = args.includes('--dev');
	const previewName = getPreviewName(args);
	const deploymentRef = previewRef(previewName);
	const createdDeployment = selectPreviewDeployment(previewName, deploymentRef);
	const entries = writePreviewEnv(previewName, deploymentRef);
	ensurePreviewDeploymentEnv(entries, deploymentRef);
	const env = previewCommandEnv(entries);
	const deployArgs = ['deploy', '--preview-name', previewName, '--env-file', envLocalFile, '--codegen', 'disable'];
	const previewRun = shouldRunPreviewSeed(createdDeployment, entries, deploymentRef)
		? getPreviewRun(entries)
		: undefined;

	const deployOutput = runConvexDeploy(deployArgs, { env });
	updatePreviewEnvFromDeployOutput(entries, deployOutput);

	let deployedEntries = loadEnvLocal();
	assertPreviewDeployment(deployedEntries, deploymentRef);
	runConvex(['codegen'], { env: previewCommandEnv(deployedEntries) });

	if (previewRun) {
		runConvex(['run', previewRun], { env: previewCommandEnv(deployedEntries) });
		markPreviewSeeded(deploymentRef);
		deployedEntries = loadEnvLocal();
	}

	if (!shouldStartDevServer) return;

	run('bun', ['run', 'dev:web'], { env: previewCommandEnv(deployedEntries) });
}

function selectPreviewDeployment(previewName: string, deploymentRef: string) {
	const deploymentSelector = `${convexProjectSelector}:${deploymentRef}`;
	const createSelector = `${convexProjectSelector}:${previewName}`;
	const env = previewCommandEnv();

	console.log(`Selecting Convex deployment ${deploymentRef}`);
	const selected = tryRunConvex(['deployment', 'select', deploymentSelector], { env });
	if (selected.ok) return false;

	console.log(`Creating Convex deployment ${deploymentRef}`);
	const createArgs = ['deployment', 'create', createSelector, '--type', 'preview'];
	const expiration = getPreviewExpiration();
	if (expiration) createArgs.push('--expiration', expiration);

	runConvex(createArgs, { env });
	runConvex(['deployment', 'select', deploymentSelector], { env });

	return true;
}

function buildGeneratedConfigs() {
	console.log('Generating worktree assistant config');
	run('bun', ['run', 'config:build'], { cwd: repoRoot });
}

function shouldRunPreviewSeed(createdDeployment: boolean, entries: Map<string, string>, deploymentRef: string) {
	return createdDeployment || entries.get(previewSeededRefKey) !== deploymentRef;
}

function getPreviewExpiration() {
	const expiration = process.env.CONVEX_PREVIEW_EXPIRATION?.trim();
	return expiration || undefined;
}

function markPreviewSeeded(deploymentRef: string) {
	const entries = loadEnvLocal();
	entries.set(previewSeededRefKey, deploymentRef);
	writeDotenv(envLocalFile, entries);
}

function ensurePreviewDeploymentEnv(entries: Map<string, string>, deploymentRef: string) {
	const rootPrefix = entries.get('OBJECT_STORAGE_ROOT_PREFIX');
	if (!rootPrefix) throw new Error(`Missing OBJECT_STORAGE_ROOT_PREFIX in ${envLocalFile}.`);

	const deploymentSelector = `${convexProjectSelector}:${deploymentRef}`;
	console.log(`Setting Convex preview Object Storage root prefix to ${rootPrefix}`);
	runConvex(['env', 'set', '--deployment', deploymentSelector, 'OBJECT_STORAGE_ROOT_PREFIX', rootPrefix], {
		env: previewCommandEnv(entries),
	});
}

function updatePreviewEnvFromDeployOutput(entries: Map<string, string>, deployOutput: string) {
	const cloudUrl = extractDeployedCloudUrl(deployOutput);
	if (!cloudUrl) return;

	entries.set('VITE_CONVEX_URL', cloudUrl);
	entries.set('VITE_CONVEX_SITE_URL', cloudUrl.replace(/\.convex\.cloud$/, '.convex.site'));
	writeDotenv(envLocalFile, entries);

	console.log(`Updated ${envLocalFile} with deployed Convex URL ${cloudUrl}`);
}

function extractDeployedCloudUrl(output: string) {
	const urls = output.match(/https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)?\.convex\.cloud/g);
	return urls?.at(-1);
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
	entries.set('OBJECT_STORAGE_ROOT_PREFIX', deploymentRef);
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

import { existsSync, rmSync } from 'node:fs';
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

const vercelPreviewEnvFile = '.env.convex.vercel-preview';
const defaultPreviewExpiration = 'in 7 days';

function main() {
	assertAppRoot();

	const previewName = getPreviewName(process.argv.slice(2));
	const deploymentRef = previewRef(previewName);

	console.log(`Preparing local preview env for ${deploymentRef}`);
	ensureVercelProjectLink();
	pullVercelPreviewEnv(previewName);
	const createdDeployment = selectConvexPreviewDeployment(deploymentRef);

	const vercelEntries = readDotenv(vercelPreviewEnvFile);
	const convexEntries = readDotenv(envLocalFile);
	const merged = new Map([...vercelEntries, ...convexEntries]);

	merged.set('CONVEX_PREVIEW_NAME', previewName);
	merged.set('CONVEX_PREVIEW_REF', deploymentRef);
	merged.set('VERCEL_ENV', 'preview');
	merged.set('VERCEL_GIT_COMMIT_REF', previewName);
	ensureConvexClientUrls(merged);

	writeDotenv(envLocalFile, merged);
	cleanupTempFile();

	console.log(`Wrote ${envLocalFile} for ${deploymentRef}`);
	console.log(`VITE_CONVEX_URL=${merged.get('VITE_CONVEX_URL') ?? '<missing>'}`);
	console.log(`VITE_CONVEX_SITE_URL=${merged.get('VITE_CONVEX_SITE_URL') ?? '<missing>'}`);

	if (createdDeployment) bootstrapFreshPreview(previewName, deploymentRef, merged);
}

function ensureVercelProjectLink() {
	if (existsSync('.vercel/project.json')) return;

	const project = process.env.VERCEL_PROJECT;
	if (!project) {
		console.log(
			'No .vercel/project.json found. Set VERCEL_PROJECT to link non-interactively, or run vercel link in apps/meseeks.',
		);
		return;
	}

	console.log(`Linking Vercel project ${project}`);
	run('bunx', ['vercel', 'link', '--yes', '--project', project]);
}

function pullVercelPreviewEnv(previewName: string) {
	console.log(`Pulling Vercel preview env for branch ${previewName}`);
	run('bunx', [
		'vercel',
		'env',
		'pull',
		vercelPreviewEnvFile,
		'--environment=preview',
		'--git-branch',
		previewName,
		'--yes',
	]);
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

function bootstrapFreshPreview(previewName: string, deploymentRef: string, entries: Map<string, string>) {
	const previewRun = entries.get('CONVEX_PREVIEW_RUN');
	if (!previewRun) return;

	const env = { ...process.env, ...Object.fromEntries(entries) };
	console.log(`Fresh preview created; deploying code and running ${previewRun}`);
	run('bun', ['./scripts/deploy-preview.ts', '--branch', previewName], { env });
	run('bunx', ['convex', 'run', '--deployment', deploymentRef, previewRun], { env });
}

function cleanupTempFile() {
	if (!existsSync(vercelPreviewEnvFile)) return;
	rmSync(vercelPreviewEnvFile, { force: true });
}

try {
	main();
} catch (error) {
	cleanupTempFile();
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

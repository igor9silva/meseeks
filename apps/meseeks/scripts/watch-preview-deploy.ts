import { spawn } from 'node:child_process';
import { existsSync, statSync, watch } from 'node:fs';
import { assertAppRoot, getPreviewName } from './preview-env';

const watchTargets = ['convex', 'lib', 'schemas', 'skills', 'convex.json', 'package.json', 'tsconfig.json'];
const debounceMs = 1000;

let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let queued = false;

function main() {
	assertAppRoot();
	const previewName = getPreviewName(process.argv.slice(2));

	console.log(`Watching Convex backend files and deploying to preview/${previewName}`);
	for (const target of watchTargets) {
		if (!existsSync(target)) continue;
		const recursive = statSync(target).isDirectory();
		watch(target, recursive ? { recursive: true } : {}, () => schedule(previewName));
	}

	deploy(previewName);
}

function schedule(previewName: string) {
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => deploy(previewName), debounceMs);
}

function deploy(previewName: string) {
	if (running) {
		queued = true;
		return;
	}

	running = true;
	queued = false;

	const child = spawn('bun', ['./scripts/deploy-preview.ts', '--branch', previewName], {
		stdio: 'inherit',
		env: process.env,
	});

	child.on('exit', (code) => {
		running = false;
		if (code !== 0) console.error(`Preview deploy failed with exit code ${code ?? 1}.`);
		if (queued) deploy(previewName);
	});
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

import { spawn } from 'node:child_process';
import { assertAppRoot, getPreviewName, loadEnvLocal, run } from './preview-env';

function main() {
	assertAppRoot();

	const previewName = getPreviewName(process.argv.slice(2));
	run('bun', ['./scripts/attach-preview-env.ts', '--branch', previewName]);

	const childEnv = {
		...process.env,
		...Object.fromEntries(loadEnvLocal()),
		VERCEL_ENV: 'preview',
		VERCEL_GIT_COMMIT_REF: previewName,
	};

	const web = spawn('bun', ['run', 'dev:web'], { stdio: 'inherit', env: childEnv });
	const convex = spawn('bun', ['./scripts/watch-preview-deploy.ts', '--branch', previewName], {
		stdio: 'inherit',
		env: childEnv,
	});

	let shuttingDown = false;
	const stop = (code = 0) => {
		if (shuttingDown) return;
		shuttingDown = true;
		web.kill('SIGTERM');
		convex.kill('SIGTERM');
		process.exit(code);
	};

	process.on('SIGINT', () => stop(0));
	process.on('SIGTERM', () => stop(0));

	web.on('exit', (code) => stop(code ?? 0));
	convex.on('exit', (code) => stop(code ?? 0));
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

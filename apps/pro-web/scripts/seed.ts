import { spawnSync } from 'node:child_process';

run('convex', ['run', 'seed:_all', '{}']);
run('bun', ['../../private/skills/deploy.ts', '--env', 'dev', '--app', 'apps/pro-web', '--delete-unspecified']);

function run(command: string, args: string[]) {
	//
	const result = spawnSync(command, args, { stdio: 'inherit' });
	if (result.status === 0) return;

	process.exit(result.status ?? 1);
}

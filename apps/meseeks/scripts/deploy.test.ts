import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function runDeploy(env: Record<string, string>) {
	// exercise the real entrypoint while replacing only the external convex process.
	const fixture = mkdtempSync(join(tmpdir(), 'meseeks-deploy-test-'));
	const log = join(fixture, 'commands');
	writeFileSync(
		join(fixture, 'bun'),
		`#!/bin/sh
printf '%s\\n' "$*" >> "$MESEEKS_DEPLOY_TEST_LOG"
if [ "$MESEEKS_DEPLOY_TEST_FAILURE" = "$2" ]; then exit 1; fi
`,
		{ mode: 0o700 },
	);
	try {
		const result = spawnSync(process.execPath, [join(import.meta.dir, 'deploy.ts')], {
			cwd: join(import.meta.dir, '..'),
			encoding: 'utf8',
			env: {
				...process.env,
				PATH: `${fixture}:${process.env.PATH}`,
				VERCEL: '1',
				VERCEL_ENV: 'preview',
				VERCEL_GIT_COMMIT_REF: 'feature-preview',
				CONVEX_PREVIEW_RUN: 'none',
				MESEEKS_DEPLOY_TEST_LOG: log,
				...env,
			},
		});
		const commands = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
		return { status: result.status, error: result.stderr, commands };
	} finally {
		rmSync(fixture, { recursive: true, force: true });
	}
}

test('deploys the backend to the PR Preview', () => {
	const result = runDeploy({});
	expect(result.status).toBe(0);
	expect(result.commands).toEqual([
		'convex deploy --preview-name feature-preview --codegen disable --cmd bun run build',
	]);
});

test('deploys production from the main Vercel pipeline', () => {
	const result = runDeploy({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main' });
	expect(result.status).toBe(0);
	expect(result.commands).toEqual(['convex deploy --cmd bun run build']);
});

test('propagates a backend deploy failure', () => {
	const result = runDeploy({ MESEEKS_DEPLOY_TEST_FAILURE: 'deploy' });
	expect(result.status).toBe(1);
	expect(result.commands).toHaveLength(1);
});

test('rejects local production deploys and production deploys from other branches', () => {
	for (const env of [
		{ VERCEL: '0', VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main' },
		{ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'other-branch' },
		{ VERCEL: '0', VERCEL_ENV: '', VERCEL_GIT_COMMIT_REF: 'main' },
	]) {
		const result = runDeploy(env);
		expect(result.status).toBe(1);
		expect(result.commands).toEqual([]);
		expect(result.error).toContain('Production deploys run only from main in the Vercel pipeline.');
	}
});

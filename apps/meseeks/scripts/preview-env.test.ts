import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPreviewName } from './preview-env';

const keys = ['VERCEL', 'VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF', 'CONVEX_PREVIEW_NAME'];
const previous = new Map<string, string | undefined>();

beforeEach(() => {
	for (const key of keys) {
		previous.set(key, process.env[key]);
		delete process.env[key];
	}
});

afterEach(() => {
	for (const [key, value] of previous) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});

describe('preview deployment selection', () => {
	test('uses the Vercel PR branch even when git or a stale preview variable names another branch', () => {
		process.env.VERCEL = '1';
		process.env.VERCEL_ENV = 'preview';
		process.env.CONVEX_PREVIEW_NAME = 'master';
		for (const branch of ['feature-one', 'feature-two']) {
			process.env.VERCEL_GIT_COMMIT_REF = branch;
			expect(getPreviewName([])).toBe(branch);
		}
	});

	test('requires a branch on Vercel and still accepts an explicit target', () => {
		process.env.VERCEL = '1';
		expect(() => getPreviewName([])).toThrow('Missing VERCEL_GIT_COMMIT_REF');
		expect(getPreviewName(['--branch', 'review-preview'])).toBe('review-preview');
	});

	test('local worktrees follow git after a branch switch despite stale preview metadata', () => {
		process.env.VERCEL_ENV = 'preview';
		process.env.VERCEL_GIT_COMMIT_REF = 'previous-branch';
		process.env.CONVEX_PREVIEW_NAME = 'previous-branch';
		const cwd = process.cwd();
		const fixture = mkdtempSync(join(tmpdir(), 'meseeks-preview-test-'));
		try {
			execFileSync('git', ['init', '--quiet', '--initial-branch', 'worktree-branch'], { cwd: fixture });
			process.chdir(fixture);
			expect(getPreviewName([])).toBe('worktree-branch');
		} finally {
			process.chdir(cwd);
			rmSync(fixture, { recursive: true, force: true });
		}
	});
});

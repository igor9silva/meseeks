'use node';

import { Daytona, CodeLanguage } from '@daytona/sdk';
import { Buffer } from 'node:buffer';
import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { writeResultFile } from './actionResults.private';
import { buildEntryMap, parse as parseScan } from './scan.private';
import { deleteBodiesBestEffort, storeBody } from './storage.private';
import { buildProposals } from './transactionProposals.private';
import { boxHome, controlDir, maxExecuteFileBytes, shellQuote, vfsStateDir, workDir } from './utils.private';
import { buildManifest } from './vfsManifest.private';
import { script as vfsScript, setupScript as setupVfsScript } from './vfs.private';
import { env } from 'schemas/envSchema';

export const runExecute = async (
	ctx: ActionCtx,
	{
		owner,
		directory,
		actionId,
		code,
		language,
		timeoutSeconds,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		actionId: Id<'actions'>;
		code: string;
		language: 'javascript' | 'python';
		timeoutSeconds: number;
	},
) => {
	const daytona = new Daytona({
		apiKey: env.DAYTONA_API_KEY,
		apiUrl: env.DAYTONA_API_URL,
		target: env.DAYTONA_TARGET,
		otelEnabled: false,
	});

	const boxId = await ctx.runMutation(internal.boxes._getOrCreateBox, {
		owner,
		directory,
		action: actionId,
	});

	await ctx.runMutation(internal.boxes._updateBox, {
		box: boxId,
		owner,
		status: 'running',
		action: actionId,
		changedFiles: [],
	});

	const tree = await ctx.runQuery(internal.files._getDirectoryTree, { owner, directory });
	const sandbox = await daytona.create(
		{
			language: language === 'python' ? CodeLanguage.PYTHON : CodeLanguage.JAVASCRIPT,
			labels: {
				pro: 'true',
				directory,
			},
			autoStopInterval: 10,
			autoArchiveInterval: 60,
			autoDeleteInterval: 24 * 60,
		},
		{ timeout: 120 },
	);

	await ctx.runMutation(internal.boxes._updateBox, {
		box: boxId,
		owner,
		status: 'running',
		action: actionId,
		providerSandboxId: sandbox.id,
		lifecycle: {
			sandboxId: sandbox.id,
			state: String(sandbox.state ?? 'created'),
		},
		changedFiles: [],
	});

	await sandbox.process.executeCommand(
		`rm -rf ${shellQuote(workDir)} ${shellQuote(controlDir)} ${shellQuote(vfsStateDir)} && mkdir -p ${shellQuote(workDir)} ${shellQuote(controlDir)} ${shellQuote(vfsStateDir)}`,
		boxHome,
		{},
		30,
	);
	const manifest = await buildManifest({ entries: tree.tree });
	await sandbox.fs.uploadFile(Buffer.from(JSON.stringify(manifest)), `${controlDir}/manifest.json`);
	await sandbox.fs.uploadFile(Buffer.from(setupVfsScript), `${controlDir}/setup_vfs.py`);
	await sandbox.fs.uploadFile(Buffer.from(vfsScript), `${controlDir}/pro_vfs.py`);
	await sandbox.process.executeCommand(`python3 ${shellQuote(`${controlDir}/setup_vfs.py`)}`, boxHome, {}, 120);
	await sandbox.process.executeCommand(
		`nohup python3 ${shellQuote(`${controlDir}/pro_vfs.py`)} mount ${shellQuote(`${controlDir}/manifest.json`)} ${shellQuote(workDir)} ${shellQuote(vfsStateDir)} > ${shellQuote(`${controlDir}/vfs.log`)} 2>&1 &`,
		boxHome,
		{},
		5,
	);
	await sandbox.process.executeCommand(
		`for i in $(seq 1 40); do mountpoint -q ${shellQuote(workDir)} && exit 0; sleep 0.25; done; cat ${shellQuote(`${controlDir}/vfs.log`)}; exit 1`,
		boxHome,
		{},
		20,
	);

	const codePath = language === 'python' ? `${controlDir}/action.py` : `${controlDir}/action.js`;
	await sandbox.fs.uploadFile(Buffer.from(code), codePath);

	const command = language === 'python' ? `python3 ${shellQuote(codePath)}` : `node ${shellQuote(codePath)}`;
	const execution = await sandbox.process.executeCommand(command, workDir, {}, timeoutSeconds);

	const scan = await sandbox.process.executeCommand(
		`python3 ${shellQuote(`${controlDir}/pro_vfs.py`)} scan ${shellQuote(vfsStateDir)} ${maxExecuteFileBytes}`,
		boxHome,
		{},
		30,
	);
	await sandbox.process
		.executeCommand(
			`sudo umount ${shellQuote(workDir)} || fusermount -u ${shellQuote(workDir)} || true`,
			boxHome,
			{},
			10,
		)
		.catch((error: unknown) => {
			const message = error instanceof Error ? error.message : String(error);
			console.warn(`Could not unmount PRO VFS: ${message}`);
		});
	const parsedScan = parseScan(scan.result);
	const originalFiles = buildEntryMap(tree.tree);
	const currentTree = await ctx.runQuery(internal.files._getDirectoryTree, { owner, directory });
	const currentFiles = buildEntryMap(currentTree.tree);
	const proposals = await buildProposals({
		scan: parsedScan,
		originalFiles,
		currentFiles,
	});

	const filesForSync = await Promise.all(
		proposals.files.map(async (file) => ({
			...file,
			storageKey: await storeBody({
				owner,
				actionId,
				content: file.content,
				contentType: file.contentType,
			}),
		})),
	);
	const stdout = execution.result.slice(0, 16_000);
	const stderr = execution.exitCode === 0 ? '' : `Exit code ${execution.exitCode}`;
	await writeResultFile(ctx, {
		owner,
		directory,
		action: actionId,
		name: 'stdout.mdx',
		content: stdout,
		contentType: 'text/mdx; charset=utf-8',
	});
	if (stderr) {
		await writeResultFile(ctx, {
			owner,
			directory,
			action: actionId,
			name: 'stderr.mdx',
			content: stderr,
			contentType: 'text/mdx; charset=utf-8',
		});
	}
	const scanResult = await ctx
		.runMutation(internal.fileTransactions._applyExecutionScan, {
			owner,
			directory,
			action: actionId,
			files: filesForSync,
			deletedPaths: proposals.deletes,
		})
		.catch(async (error: unknown) => {
			await deleteBodiesBestEffort(filesForSync.map((file) => file.storageKey));
			throw error;
		});
	if (scanResult.changedFiles.length === 0) {
		await deleteBodiesBestEffort(filesForSync.map((file) => file.storageKey));
	} else {
		await deleteBodiesBestEffort(scanResult.previousStorageKeys);
	}
	await deleteBodiesBestEffort(scanResult.unusedStorageKeys);

	const changedFiles = scanResult.changedFiles;
	const allConflicts = proposals.conflicts.concat(scanResult.conflicts);
	const logs =
		allConflicts.length === 0
			? stdout
			: `${stdout}\n\n## Conflicts\n${allConflicts.map((conflict) => `- ${conflict}`).join('\n')}`;
	await ctx.runMutation(internal.boxes._updateBox, {
		box: boxId,
		owner,
		status: execution.exitCode === 0 ? 'idle' : 'failed',
		action: actionId,
		providerSandboxId: sandbox.id,
		logs,
		changedFiles,
		lifecycle: {
			sandboxId: sandbox.id,
			state: String(sandbox.state ?? 'unknown'),
			exitCode: String(execution.exitCode),
		},
	});

	await ctx.runMutation(internal.actions._recordDetail, {
		detail: {
			action: actionId,
			owner,
			directory,
			kind: 'execute',
			provider: 'daytona',
			box: boxId,
			providerSandboxId: sandbox.id,
			command,
			exitCode: execution.exitCode,
			stdout: logs,
			changedFiles,
			warnings: allConflicts,
			createdAt: Date.now(),
		},
	});

	if (execution.exitCode !== 0) {
		throw new Error(`Daytona execute failed with exit code ${execution.exitCode}.`);
	}

	return {
		logs: logs || 'Daytona execute completed.',
		changedFiles,
	};
};

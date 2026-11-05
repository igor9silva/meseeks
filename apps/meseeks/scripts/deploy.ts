import { assertAppRoot, getPreviewName, getPreviewRun, previewRef, runConvex, runConvexDeploy } from './preview-env';

function main() {
	//
	assertAppRoot();
	const cleanupArgs = ['run', 'skills:_cleanupInputSchemaBackups', JSON.stringify({ dryRun: false })];

	if (process.env.VERCEL_ENV === 'preview') {
		const previewName = getPreviewName(process.argv.slice(2));
		const args = ['deploy', '--preview-name', previewName, '--codegen', 'disable', '--cmd', 'bun run build'];
		const previewRun = getPreviewRun();
		if (previewRun) args.push('--preview-run', previewRun);

		runConvexDeploy(args);
		runConvex(cleanupArgs.concat('--deployment', previewRef(previewName)));
		return;
	}

	if (
		process.env.VERCEL !== '1' ||
		process.env.VERCEL_ENV !== 'production' ||
		process.env.VERCEL_GIT_COMMIT_REF !== 'main'
	) {
		throw new Error('Production deploys run only from main in the Vercel pipeline.');
	}

	runConvex(['deploy', '--cmd', 'bun run build']);
	// the schema must still accept old fields while the pipeline deletes their stored values.
	runConvex(cleanupArgs.concat('--prod'));
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

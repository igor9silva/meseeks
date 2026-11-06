import { assertAppRoot, getPreviewName, getPreviewRun, runConvex, runConvexDeploy } from './preview-env';

function main() {
	//
	assertAppRoot();

	if (process.env.VERCEL_ENV === 'preview') {
		const previewName = getPreviewName(process.argv.slice(2));
		const args = ['deploy', '--preview-name', previewName, '--codegen', 'disable', '--cmd', 'bun run build'];
		const previewRun = getPreviewRun();
		if (previewRun) args.push('--preview-run', previewRun);

		runConvexDeploy(args);
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
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

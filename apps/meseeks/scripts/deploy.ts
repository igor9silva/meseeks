import { assertAppRoot, getPreviewName, getPreviewRun, runConvex, runConvexDeploy } from './preview-env';

function main() {
	assertAppRoot();

	if (process.env.VERCEL_ENV === 'preview') {
		const previewName = getPreviewName(process.argv.slice(2));
		const args = ['deploy', '--preview-name', previewName, '--codegen', 'disable', '--cmd', 'bun run build'];
		const previewRun = getPreviewRun();
		if (previewRun) args.push('--preview-run', previewRun);

		runConvexDeploy(args);
		return;
	}

	runConvex(['deploy', '--cmd', 'bun run build']);
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

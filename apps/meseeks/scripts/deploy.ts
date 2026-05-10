import { assertAppRoot, getPreviewName, getPreviewRun, runConvex } from './preview-env';

function main() {
	assertAppRoot();

	if (process.env.VERCEL_ENV === 'preview') {
		const previewName = getPreviewName(process.argv.slice(2));
		const args = ['deploy', '--preview-name', previewName, '--cmd', 'bun run build'];
		const previewRun = getPreviewRun();
		if (previewRun) args.push('--preview-run', previewRun);

		runConvex(args);
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

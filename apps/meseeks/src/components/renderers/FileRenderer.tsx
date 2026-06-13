import type { Doc } from 'convex/_generated/dataModel';
import { MdxFileRenderer } from './MdxFileRenderer';
import { TextFileRenderer } from './TextFileRenderer';
import { TsxFileRenderer } from './TsxFileRenderer';

interface FileRendererProps {
	//
	file?: Doc<'files'> | null;
	content?: string;
	isLoading: boolean;
}

export function FileRenderer({ file, content, isLoading }: FileRendererProps) {
	//
	if (isLoading) {
		return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
	}

	if (!file) {
		return <div className="p-4 text-sm text-muted-foreground">Nothing to render.</div>;
	}

	if (content === undefined) {
		return <div className="p-4 text-sm text-muted-foreground">No text cache is available for this file.</div>;
	}

	const kind = getRendererKind(file);
	if (kind === 'markdown') return <MdxFileRenderer content={content} shouldRenderComponents={false} />;
	if (kind === 'tsx') return <TsxFileRenderer content={content} />;
	return <TextFileRenderer content={content} />;
}

function getRendererKind(file: Doc<'files'>) {
	//
	const name = file.name.toLowerCase();
	const contentType = file.contentType?.toLowerCase() ?? '';
	if (
		name.endsWith('.md') ||
		name.endsWith('.markdown') ||
		name.endsWith('.mdx') ||
		contentType.includes('markdown') ||
		contentType.includes('mdx')
	) {
		return 'markdown';
	}
	if (name.endsWith('.tsx') || name.endsWith('.jsx') || contentType.includes('tsx')) return 'tsx';
	return 'text';
}

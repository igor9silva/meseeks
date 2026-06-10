import { TimeAgo } from '~/components/TimeAgo';
import { Card, CardContent, CardHeader } from '@reactor/ui/card';
import MDX from '~/components/ui/mdx';
import { useCurrentFile } from '~/hooks/useCurrentFile';
import { useRenameFile, useUpdateContent } from '~/hooks/useFileMutations';
import { cn } from '@reactor/ui/lib/utils';
import { CollapsibleSummary } from './CollapsibleSummary';
import { EditableContent } from './EditableContent';

export default function FileDetail({
	className, //
}: {
	className?: string;
}) {
	//
	const { file } = useCurrentFile();
	const { renameFile, isRenamingFile } = useRenameFile();
	const { updateContent, isUpdatingContent } = useUpdateContent();

	return (
		<Card
			className={cn(
				'whitespace-pre-wrap border-none rounded-none overflow-auto h-full justify-between flex flex-col p-4 md:p-0',
				className,
			)}
		>
			<CardHeader className="p-4 max-w-full top-0 z-10">
				<div className="flex flex-col">
					<div className="flex flex-row justify-between gap-2 items-center min-w-0">
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<EditableContent
								key={file.name}
								value={file.name ?? ''}
								onSave={(name) => renameFile({ fileId: file._id, name })}
								isPending={isRenamingFile}
								viewClassName="text-base md:text-xl font-bold leading-none break-words overflow-wrap-anywhere min-w-0 flex-1"
								asView={({ value, className, isEmpty, isPending }) => (
									<h1
										className={cn(
											!file.isActive && 'line-through',
											isPending && 'opacity-50',
											className,
										)}
									>
										{isEmpty ? (
											<span className="text-muted-foreground italic">
												Double tap to set a title
											</span>
										) : (
											value
										)}
									</h1>
								)}
							/>
						</div>
					</div>
					<div className="flex items-center gap-0.5">
						<TimeAgo date={file._creationTime} suffix="old" className="text-sm text-muted-foreground" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="px-4 py-0 flex-grow flex flex-col">
				<EditableContent
					key={file.content}
					value={file.content ?? ''}
					onSave={(content) => updateContent({ fileId: file._id, content })}
					isPending={isUpdatingContent}
					multiline
					asView={({ value, enterEditMode, className, isEmpty, isPending }) => (
						<div className={cn(isPending && 'opacity-50', className)}>
							{isEmpty ? (
								<div className="text-muted-foreground text-sm italic">Double tap to edit plan</div>
							) : shouldRenderRawContent({ name: file.name, value }) ? (
								<RawContent value={value} />
							) : (
								<MDX
									text={value}
									onClickFix={enterEditMode}
									shouldRenderComponents={shouldRenderMdxComponents({ name: file.name })}
								/>
							)}
						</div>
					)}
					viewClassName="w-full h-full"
					editClassName="h-full"
				/>
				{file.summary && <CollapsibleSummary summary={file.summary} />}
			</CardContent>
		</Card>
	);
}

function RawContent({ value }: { value: string }) {
	//
	return (
		<pre className="max-w-full overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
			{value}
		</pre>
	);
}

const rawContentExtensions = [
	'.json',
	'.js',
	'.jsx',
	'.ts',
	'.tsx',
	'.mjs',
	'.cjs',
	'.css',
	'.sql',
	'.toml',
	'.yaml',
	'.yml',
];

function shouldRenderRawContent({ name, value }: { name?: string | null; value: string }) {
	//
	const normalizedName = name?.toLowerCase() ?? '';
	if (rawContentExtensions.some((extension) => normalizedName.endsWith(extension))) return true;

	const trimmed = value.trimStart();
	return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function shouldRenderMdxComponents({ name }: { name?: string | null }) {
	//
	return name?.toLowerCase().endsWith('.mdx') ?? false;
}

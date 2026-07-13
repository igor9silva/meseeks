import { Id } from 'convex/_generated/dataModel';
import { Suspense } from 'react';
import { FileList } from '~/components/Inbox';
import { Loading } from '~/components/Loading';
import { QuickSeek } from '~/components/QuickSeek';
import { FileConversation } from '~/components/FileConversation';
import FileDetail from '~/components/FileDetail';
import { FileDetailAndConversation } from '~/components/layout/FileDetailAndConversation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@pro/ui/resizable';
import { useCurrentFileId } from '~/hooks/useCurrentFile';
import {
	useInboxWidthPercentPreference,
	useFileDetailVisiblePreference,
	useFileListVisiblePreference,
} from '~/hooks/preferences';
import { useResizablePanelGroup } from '@pro/ui/hooks/useResizablePanelGroup';
import { cn } from '@pro/ui/lib/utils';

interface FileWorkspaceProps {
	parentFileId?: Id<'files'> | 'inbox';
	list?: 'inbox' | 'tasks';
	className?: string;
}

export function FileWorkspace(props: FileWorkspaceProps) {
	//
	return (
		<Suspense fallback={<Loading />}>
			<FileWorkspaceContent {...props} />
		</Suspense>
	);
}

function FileWorkspaceContent({ parentFileId = 'inbox', list = 'inbox', className }: FileWorkspaceProps) {
	//
	const {
		getInboxWidthPercent, //
		setInboxWidthPercent,
	} = useInboxWidthPercentPreference({ defaultValue: 25 });

	const {
		isFileListVisible, //
		setIsFileListVisible,
	} = useFileListVisiblePreference();

	const {
		isFileDetailVisible, //
		setIsFileDetailVisible,
	} = useFileDetailVisiblePreference();

	const { getPanelSize, handleDragging, handleLayout } = useResizablePanelGroup({
		getValue: getInboxWidthPercent,
		setValue: setInboxWidthPercent,
	});

	const preferredWidthPercent = getPanelSize();

	return (
		<ResizablePanelGroup
			direction="horizontal"
			onLayout={isFileListVisible ? handleLayout : undefined}
			className={cn('overflow-hidden', className)}
		>
			{isFileListVisible && (
				<ResizablePanel
					key="file-list-panel"
					id="list"
					order={0}
					defaultSize={preferredWidthPercent}
					minSize={15}
					className="hidden md:block"
				>
					<Suspense fallback={<Loading />}>
						<FileListWrapper list={list} parentFileId={parentFileId} />
					</Suspense>
				</ResizablePanel>
			)}
			{isFileListVisible && (
				<ResizableHandle
					className="hidden md:flex"
					onClick={() => setIsFileListVisible(!isFileListVisible)}
					onDragging={handleDragging}
				/>
			)}
			<ResizablePanel
				key="file-content-panel"
				id="detail"
				order={1}
				defaultSize={isFileListVisible ? 100 - preferredWidthPercent : 100}
				minSize={15}
				className="max-md:!flex-1"
			>
				<Suspense fallback={<Loading />}>
					<FileDetailWithConditionalRendering
						onToggleList={() => setIsFileListVisible(!isFileListVisible)}
						onToggleFileDetail={() => setIsFileDetailVisible(!isFileDetailVisible)}
						isFileListVisible={isFileListVisible}
						isFileDetailVisible={isFileDetailVisible}
					/>
				</Suspense>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

function FileDetailWithConditionalRendering({
	onToggleList,
	onToggleFileDetail,
	isFileListVisible,
	isFileDetailVisible,
}: {
	onToggleList?: () => void;
	onToggleFileDetail?: () => void;
	isFileListVisible: boolean;
	isFileDetailVisible: boolean;
}) {
	//
	const currentFileId = useCurrentFileId();

	if (!currentFileId) {
		return (
			<FileDetailAndConversation
				list={undefined}
				detail={<QuickCreatePanel />}
				onToggleFileDetail={onToggleFileDetail}
			/>
		);
	}

	return (
		<FileDetailAndConversation
			list={isFileDetailVisible ? <FileDetail /> : undefined}
			detail={
				<FileConversation
					onToggleList={onToggleList}
					onToggleFileDetail={onToggleFileDetail}
					isFileListVisible={isFileListVisible}
					isFileDetailVisible={isFileDetailVisible}
				/>
			}
			onToggleFileDetail={onToggleFileDetail}
		/>
	);
}

function FileListWrapper({
	list,
	parentFileId = 'inbox',
}: {
	list: 'inbox' | 'tasks';
	parentFileId?: Id<'files'> | 'inbox';
}) {
	//
	const currentFileId = useCurrentFileId();

	return <FileList filter={list} parentFileId={parentFileId} currentFileId={currentFileId} />;
}

function QuickCreatePanel() {
	//
	return (
		<div className="h-full">
			<QuickSeek />
		</div>
	);
}

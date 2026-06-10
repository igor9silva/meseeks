import { Link } from '@tanstack/react-router';
import {
	Archive,
	CheckCircle,
	CodeXml,
	PanelLeftClose,
	PanelLeftOpen,
	PanelRightClose,
	PanelRightOpen,
} from 'lucide-react';
import { AddBudgetButton } from '~/components/AddBudgetButton';
import { ReopenButton } from '~/components/ReopenButton';
import { Button } from '@pro/ui/button';
import { LoadingButton } from '@pro/ui/loading-button';
import { Toggle } from '@pro/ui/toggle';
import type { FileView } from '~/hooks/query/useFile';

interface FileConversationActionsProps {
	file: FileView;
	onToggleList?: () => void;
	onToggleFileDetail?: () => void;
	isFileListVisible: boolean;
	isFileDetailVisible: boolean;
	isDebugMode: boolean;
	isResolving: boolean;
	isDiscarding: boolean;
	resolve: (args: { fileId: FileView['_id'] }) => void;
	discard: (args: { fileId: FileView['_id'] }) => void;
}

export function FileConversationActions({
	file,
	onToggleList,
	onToggleFileDetail,
	isFileListVisible,
	isFileDetailVisible,
	isDebugMode,
	isResolving,
	isDiscarding,
	resolve,
	discard,
}: FileConversationActionsProps) {
	//
	return (
		<div className="flex w-full items-center justify-between gap-2">
			<div className="flex gap-2">
				{onToggleList && (
					<Button
						size="sm"
						variant="ghost"
						onClick={onToggleList}
						className="hidden md:flex items-center gap-1"
						title={isFileListVisible ? 'Hide file list' : 'Show file list'}
						aria-label={isFileListVisible ? 'Hide file list' : 'Show file list'}
					>
						{isFileListVisible ? (
							<PanelLeftClose className="h-4 w-4" />
						) : (
							<PanelLeftOpen className="h-4 w-4" />
						)}
					</Button>
				)}
				{file.isActive ? (
					<>
						<LoadingButton
							size="sm"
							variant="ghost"
							onClick={() => {
								if (isResolving) return;
								resolve({ fileId: file._id });
							}}
							loading={isResolving}
							loadingText="Resolving..."
							icon={<CheckCircle className="mr-2 h-4 w-4" />}
							className="flex items-center"
						>
							Resolve
						</LoadingButton>
						<LoadingButton
							size="sm"
							variant="ghost"
							onClick={() => {
								if (isDiscarding) return;
								discard({ fileId: file._id });
							}}
							loading={isDiscarding}
							loadingText="Discarding..."
							icon={<Archive className="mr-2 h-4 w-4" />}
							className="flex items-center"
						>
							Discard
						</LoadingButton>
					</>
				) : (
					<>
						<ReopenButton />
						<AddBudgetButton amount={0.2} text="Add 0.20" />
						<AddBudgetButton amount={1} text="Add 1.00" />
					</>
				)}
			</div>
			<div className="hidden md:flex items-center gap-2">
				<Link to="/$" search={(prev) => ({ ...prev, debug: isDebugMode ? undefined : true })}>
					<Toggle
						aria-label="Toggle Dev Mode (former Debug)"
						pressed={isDebugMode}
						className="h-8 px-2 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
					>
						<CodeXml className="h-4 w-4 mr-1" />
						Dev Mode
					</Toggle>
				</Link>
				{onToggleFileDetail && (
					<Button
						size="sm"
						variant="ghost"
						onClick={onToggleFileDetail}
						className="flex items-center gap-1"
						title={isFileDetailVisible ? 'Hide file detail' : 'Show file detail'}
						aria-label={isFileDetailVisible ? 'Hide file detail' : 'Show file detail'}
					>
						{isFileDetailVisible ? (
							<PanelRightClose className="h-4 w-4" />
						) : (
							<PanelRightOpen className="h-4 w-4" />
						)}
					</Button>
				)}
			</div>
		</div>
	);
}

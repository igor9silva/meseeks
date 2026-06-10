import { Loading } from '~/components/Loading';
import { CommandGroup } from '@pro/ui/command';
import type { LauncherFile } from '../types';
import { FileResultItem } from './FileResultItem';

interface FilesSectionProps {
	isLoadingMore: boolean;
	onNavigate: (value: string) => void;
	files: LauncherFile[];
}

export function FilesSection({ isLoadingMore, onNavigate, files }: FilesSectionProps) {
	//
	return (
		<CommandGroup heading="Files">
			{files.map((file) => (
				<FileResultItem key={file._id} file={file} onSelect={onNavigate} />
			))}
			{isLoadingMore && <Loading className="py-4" />}
		</CommandGroup>
	);
}

import { StatusIndicator } from '~/components/StatusIndicator';
import type { FileView, FileViewStatus } from '~/hooks/query/useFile';
import { cn } from '@pro/ui/lib/utils';

const classMap: Record<FileViewStatus, string> = {
	idle: 'hidden',
	unread: 'bg-blue-500',
	acting: 'hidden',
	blocked: 'bg-orange-700',
	done: 'hidden',
	discarded: 'hidden',
};

const labelMap: Record<FileViewStatus, string> = {
	idle: 'Idle file',
	unread: 'Unread file',
	acting: 'File is acting',
	blocked: 'Blocked file',
	done: 'Done file',
	discarded: 'Discarded file',
};

export const FileStatusIndicator = ({
	file, //
	className,
}: {
	file: FileView;
	className?: string;
}) => {
	//
	return <StatusIndicator className={cn(classMap[file.status], className)} label={labelMap[file.status]} />;
};

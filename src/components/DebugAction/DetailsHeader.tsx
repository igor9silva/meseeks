import { ChevronDown, ChevronRight } from 'lucide-react';

export function DetailsHeader({
	isOpen,
	onClick,
	title,
	summary,
}: {
	isOpen: boolean;
	onClick: () => void;
	title: string;
	summary: string;
}) {
	//
	return (
		<div
			className="flex items-center gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
			onClick={onClick}
		>
			{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
			{title}
			{summary && <span className="text-muted-foreground font-normal text-xs">{summary}</span>}
		</div>
	);
}

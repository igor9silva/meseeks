import { Tabs, TabsList, TabsTrigger } from '@pro/ui';
import { List, SquareKanban } from 'lucide-react';
import type { TaskConfig } from '~/server/taskIndexSchemas';

export function ViewTabs({
	currentView,
	onViewChange,
}: {
	currentView: TaskConfig['view'];
	onViewChange: (view: TaskConfig['view']) => void;
}) {
	//
	return (
		<Tabs value={currentView} onValueChange={(value) => onViewChange(value === 'board' ? 'board' : 'list')}>
			<TabsList className="h-8 rounded-full">
				<TabsTrigger
					value="list"
					className="h-6 gap-1 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
				>
					<List className="size-3.5" />
					List
				</TabsTrigger>
				<TabsTrigger
					value="board"
					className="h-6 gap-1 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
				>
					<SquareKanban className="size-3.5" />
					Board
				</TabsTrigger>
			</TabsList>
		</Tabs>
	);
}

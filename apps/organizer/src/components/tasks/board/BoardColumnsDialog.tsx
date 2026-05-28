import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@reactor/ui';
import { Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';
import type { TaskConfig, TaskConfigColumn } from '~/server/taskIndexSchemas';
import { createDefaultColumn, normalizeColumns, validateColumns } from './boardColumns';
import { BoardColumnEditor } from './BoardColumnEditor';

export function BoardColumnsDialog({
	columns,
	onColumnsChange,
}: {
	columns: TaskConfig['columns'];
	onColumnsChange: (columns: TaskConfig['columns']) => void;
}) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const [draftColumns, setDraftColumns] = useState(columns);
	const canSaveColumns = validateColumns(draftColumns);

	const handleOpenChange = (nextIsOpen: boolean) => {
		if (nextIsOpen) {
			setDraftColumns(columns);
		}

		setIsOpen(nextIsOpen);
	};

	const handleColumnChange = (columnId: string, nextColumn: TaskConfigColumn) => {
		setDraftColumns((currentColumns) =>
			currentColumns.map((column) => {
				if (column.id !== columnId) return column;
				return nextColumn;
			}),
		);
	};

	const handleColumnAdd = () => {
		setDraftColumns((currentColumns) => currentColumns.concat(createDefaultColumn(currentColumns)));
	};

	const handleColumnRemove = (columnId: string) => {
		setDraftColumns((currentColumns) => currentColumns.filter((column) => column.id !== columnId));
	};

	const handleSave = () => {
		if (!canSaveColumns) return;
		onColumnsChange(normalizeColumns(draftColumns));
		setIsOpen(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					type="button"
					size="action"
					variant="ghost"
					aria-label="Configure board columns"
					title="Configure board columns"
					className="rounded-md"
				>
					<Settings2 className="size-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-3xl rounded-lg p-0">
				<DialogHeader className="border-b border-border/80 px-4 py-3">
					<DialogTitle className="text-base">Board columns</DialogTitle>
				</DialogHeader>
				<div className="max-h-96 space-y-2 overflow-auto px-4 py-3">
					{draftColumns.length === 0 ? (
						<div className="rounded-md border border-border/80 px-3 py-4 text-sm text-muted-foreground">
							No columns.
						</div>
					) : null}
					{draftColumns.map((column) => (
						<BoardColumnEditor
							key={column.id}
							column={column}
							onColumnChange={(nextColumn) => handleColumnChange(column.id, nextColumn)}
							onColumnRemove={() => handleColumnRemove(column.id)}
						/>
					))}
				</div>
				<DialogFooter className="border-t border-border/80 px-4 py-3">
					<Button type="button" variant="outline" size="sm" onClick={handleColumnAdd} className="rounded-md">
						<Plus className="size-4" />
						Add
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={handleSave}
						disabled={!canSaveColumns}
						className="rounded-md"
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

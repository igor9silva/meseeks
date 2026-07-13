import { Button, Input } from '@pro/ui';
import { Trash2 } from 'lucide-react';
import type { TaskConfigColumn } from '~/server/taskIndexSchemas';
import { createColumnMatchForType, parseColumnMatchType, parseColumnSource } from './boardColumns';

export function BoardColumnEditor({
	column,
	onColumnChange,
	onColumnRemove,
}: {
	column: TaskConfigColumn;
	onColumnChange: (column: TaskConfigColumn) => void;
	onColumnRemove: () => void;
}) {
	//
	const handleMatchTypeChange = (value: string) => {
		const matchType = parseColumnMatchType(value);
		if (matchType === null) return;
		onColumnChange({
			...column,
			match: createColumnMatchForType(matchType, column),
		});
	};

	return (
		<div className="flex flex-wrap items-center gap-2 rounded-md border border-border/80 bg-background p-2">
			<label className="sr-only" htmlFor={`${column.id}-label`}>
				Column label
			</label>
			<Input
				id={`${column.id}-label`}
				value={column.label}
				onChange={(event) =>
					onColumnChange({
						...column,
						label: event.currentTarget.value,
					})
				}
				className="h-8 min-w-40 flex-1 rounded-md"
			/>
			<label className="sr-only" htmlFor={`${column.id}-match-type`}>
				Column match type
			</label>
			<select
				id={`${column.id}-match-type`}
				value={column.match.type}
				onChange={(event) => handleMatchTypeChange(event.currentTarget.value)}
				className="h-8 w-32 rounded-md border border-input bg-background px-2 text-xs"
			>
				<option value="tag">Tag</option>
				<option value="source">Source</option>
			</select>
			<ColumnMatchValueControl column={column} onColumnChange={onColumnChange} />
			<Button
				type="button"
				size="action"
				variant="ghost"
				aria-label={`Remove ${column.label}`}
				title="Remove column"
				onClick={onColumnRemove}
				className="rounded-md text-muted-foreground hover:text-destructive"
			>
				<Trash2 className="size-4" />
			</Button>
		</div>
	);
}

function ColumnMatchValueControl({
	column,
	onColumnChange,
}: {
	column: TaskConfigColumn;
	onColumnChange: (column: TaskConfigColumn) => void;
}) {
	//
	if (column.match.type === 'tag') {
		return (
			<>
				<label className="sr-only" htmlFor={`${column.id}-tag`}>
					Column tag
				</label>
				<Input
					id={`${column.id}-tag`}
					value={column.match.tag}
					onChange={(event) =>
						onColumnChange({
							...column,
							match: {
								type: 'tag',
								tag: event.currentTarget.value,
							},
						})
					}
					className="h-8 min-w-48 flex-1 rounded-md"
				/>
			</>
		);
	}

	return (
		<>
			<label className="sr-only" htmlFor={`${column.id}-source`}>
				Column source
			</label>
			<select
				id={`${column.id}-source`}
				value={column.match.source}
				onChange={(event) => {
					const taskSource = parseColumnSource(event.currentTarget.value);
					if (taskSource === null) return;
					onColumnChange({
						...column,
						match: {
							type: 'source',
							source: taskSource,
						},
					});
				}}
				className="h-8 min-w-48 flex-1 rounded-md border border-input bg-background px-2 text-xs"
			>
				<option value="public">Public</option>
				<option value="private">Private</option>
			</select>
		</>
	);
}

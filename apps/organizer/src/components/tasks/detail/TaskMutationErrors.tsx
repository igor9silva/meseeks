import { getMutationErrorMessage } from '../taskExplorerUtils';

export interface TaskMutationErrorEntry {
	error: unknown;
	fallback: string;
}

export function TaskMutationErrors({ entries }: { entries: TaskMutationErrorEntry[] }) {
	//
	return (
		<>
			{entries.map((entry) =>
				entry.error ? (
					<div key={entry.fallback} className="mt-2 text-sm text-destructive">
						{getMutationErrorMessage(entry.error, entry.fallback)}
					</div>
				) : null,
			)}
		</>
	);
}

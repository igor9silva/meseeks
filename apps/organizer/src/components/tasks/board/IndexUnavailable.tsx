import { AlertTriangle } from 'lucide-react';
import type { TaskBoardHeaderState } from './TaskBoardHeaderTypes';

export function IndexUnavailable({ state }: { state: TaskBoardHeaderState }) {
	//
	if (!state.shouldShowIndexUnavailable) return null;

	return (
		<div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
			<div className="flex items-center gap-2 font-medium text-destructive">
				<AlertTriangle className="size-4" />
				Task indexes are unavailable
			</div>
			{state.health?.errors.map((error) => (
				<div key={error} className="break-words text-destructive/90">
					{error}
				</div>
			))}
			{state.health?.generatedDir ? (
				<div className="mt-1 text-muted-foreground">
					Expected <code>{state.health.generatedDir}</code>
				</div>
			) : null}
		</div>
	);
}

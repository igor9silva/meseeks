import { FileText, X } from 'lucide-react';
import { Button } from '@reactor/ui/button';
import { useComposer, type ServerDraft } from '~/hooks/useComposer';

export function DraftStrip() {
	//
	const { pendingServerDraft, restoreServerDraft, dismissServerDraft } = useComposer();

	if (!pendingServerDraft) return null;

	const preview = getPreview(pendingServerDraft);
	const queuedCount = pendingServerDraft.queue.length;
	const hasQueued = queuedCount > 0;

	return (
		<div className="border-t border-border/50 px-4 py-1.5">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
					<FileText className="size-4 shrink-0" />
					<span className="truncate">
						Draft: {hasQueued ? `${queuedCount} action${queuedCount > 1 ? 's' : ''} +` : ''} "{preview}"
					</span>
				</div>
				<div className="flex gap-1 shrink-0">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
						onClick={dismissServerDraft}
					>
						<X className="size-3 mr-1" />
						Dismiss
					</Button>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						className="h-6 px-2 text-xs"
						onClick={restoreServerDraft}
					>
						Restore
					</Button>
				</div>
			</div>
		</div>
	);
}

function getPreview(draft: ServerDraft): string {
	//
	if (draft.message.trim()) {
		const msg = draft.message.trim();
		return msg.length > 40 ? msg.slice(0, 40) + '...' : msg;
	}

	if (draft.queue.length > 0) {
		return `${draft.queue.length} queued action${draft.queue.length > 1 ? 's' : ''}`;
	}

	return 'empty draft';
}

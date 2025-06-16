import { Square, X } from 'lucide-react';
import { ActionButton } from '~/components/ui/action-button';
import { TextShimmer } from '~/components/ui/text-shimmer';

export function RecordingState({
	stopRecording,
	cancelRecording,
}: {
	stopRecording: () => void;
	cancelRecording: () => void;
}) {
	//
	return (
		<>
			<div className="flex flex-grow items-center justify-center px-3">
				<TextShimmer text="Recording voice..." size="lg" />
			</div>

			<div className="flex items-center justify-between gap-2 px-3 pt-2">
				<div className="flex-shrink-0">{/* Empty div to maintain layout consistency */}</div>

				<div className="flex items-center gap-2">
					<ActionButton
						icon={<Square className="size-5" />}
						onClick={stopRecording}
						tooltip="Stop & transcribe"
						variant="secondary"
					/>
					<ActionButton
						icon={<X className="size-5" />}
						onClick={cancelRecording}
						tooltip="Cancel recording"
						variant="destructive"
					/>
				</div>
			</div>
		</>
	);
}

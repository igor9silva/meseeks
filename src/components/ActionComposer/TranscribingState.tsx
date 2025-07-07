import { X } from 'lucide-react';
import { ActionButton } from '~/components/ui/action-button';
import { TextShimmer } from '~/components/ui/text-shimmer';

export function TranscribingState({ cancelRecording }: { cancelRecording: () => void }) {
	//
	return (
		<>
			<div className="flex flex-grow items-center justify-center px-3">
				<TextShimmer text="Transcribing voice..." size="lg" />
			</div>

			<div className="flex items-center justify-between gap-2 px-1 pt-2">
				<div className="flex items-center gap-2">{/* Empty div to maintain layout consistency */}</div>

				<div className="flex items-center gap-2">
					<ActionButton
						icon={<X className="size-5" />}
						onClick={cancelRecording}
						tooltip="Cancel transcription"
						variant="destructive"
					/>
				</div>
			</div>
		</>
	);
}

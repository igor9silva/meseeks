import type { Doc } from 'convex/_generated/dataModel';
import { useMemo, useRef } from 'react';
import { intelligenceKeys } from 'schemas/intelligenceSchema';
import { z } from 'zod/v3';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';
import { Composer, type ComposerHandle } from '~/components/Composer';
import { IntelligenceSelector } from '~/components/IntelligenceSelector';
import { SkillsLink } from '~/components/SkillsLink';
import { useComposer } from '~/hooks/useComposer';
import { useSetPreferredIntelligence, useStop } from '~/hooks/useTaskMutations';
import { StripContainer } from './strips/StripContainer';

interface ActionComposerProps {
	task: Doc<'tasks'>;
	onSubmit?: (message: string) => void;
	className?: string;
}

export function ActionComposer({ task, onSubmit, className }: ActionComposerProps) {
	//
	const composerRef = useRef<ComposerHandle>(null);
	const intelligenceSelectorRef = useRef<HTMLButtonElement | null>(null);
	const { queue, message, enqueue, setMessage, submit } = useComposer();
	const { stop, isStopping } = useStop();
	const { setPreferredIntelligence, isSettingPreferredIntelligence } = useSetPreferredIntelligence();

	const isMessageEmpty = message.trim().length === 0;
	const isComposing = !isMessageEmpty || queue.length > 0;
	const isBlocked = task.status === 'blocked' && isMessageEmpty;
	const isTaskActing = task.status === 'acting' && isMessageEmpty;
	const canRequestIteration = isMessageEmpty && !isBlocked && !isTaskActing && queue.length === 0;

	const voicePromptContext = useMemo(() => {
		//
		return [
			task.title ? `Task: ${task.title}` : null, //
			message ? `Draft: ${message}` : null,
		]
			.filter(Boolean)
			.join('\n');
	}, [message, task.title]);

	const handleAct = async () => {
		//
		await submit(task);

		if (!isMessageEmpty) {
			onSubmit?.(message);
		}
	};

	const handleEnqueueMessage = () => {
		//
		const trimmed = message.trim();
		if (!trimmed) return;

		enqueue(
			{
				skillKey: 'say',
				args: { message: trimmed },
				source: 'input',
			},
			{ clearMessage: true },
		);
	};

	const handleStop = () => {
		//
		stop({ taskId: task._id });
	};

	const handleIntelligenceChange = (key: z.infer<typeof intelligenceKeys>) => {
		//
		if (isSettingPreferredIntelligence) return;
		setPreferredIntelligence({ taskId: task._id, preferredIntelligence: key });
	};

	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'i' },
		callback: () => composerRef.current?.focusEnd(),
	});

	useKeyboardShortcut({
		global: true,
		combo: { withCtrl: true, key: 'c' },
		skipPreventDefault: true,
		callback: (event) => {
			if (task.status === 'acting' && !isStopping) {
				handleStop();
				event.preventDefault();
			}
		},
	});

	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: '/' },
		callback: () => intelligenceSelectorRef.current?.click(),
	});

	return (
		<Composer
			ref={composerRef}
			value={message}
			onValueChange={setMessage}
			onSubmit={handleAct}
			onEnqueue={handleEnqueueMessage}
			onStop={handleStop}
			promptContext={voicePromptContext}
			className={className}
			strips={<StripContainer task={task} />}
			leadingControls={
				<>
					<IntelligenceSelector
						value={task.preferredIntelligence}
						onChange={handleIntelligenceChange}
						ref={intelligenceSelectorRef}
					/>
					<SkillsLink />
				</>
			}
			isActing={isTaskActing}
			isBlocked={isBlocked}
			isComposing={isComposing}
			canRequestIteration={canRequestIteration}
			hasQueuedItems={queue.length > 0}
			isStopping={isStopping}
		/>
	);
}

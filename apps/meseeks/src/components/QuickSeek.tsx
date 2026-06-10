import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { Doc } from 'convex/_generated/dataModel';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@reactor/ui/lib/utils';

import { INSUFFICIENT_ACCOUNT_FUNDS_ERROR, isError } from 'lib/errors';
import { ArrowUp, ChevronDown, CircleOff, MessageCircle, Mic, Radar } from 'lucide-react';
import { RecordingState } from '~/components/ActionComposer/RecordingState';
import { TranscribingState } from '~/components/ActionComposer/TranscribingState';
import {
	IntelligencePicker,
	intelligencePickerOptionsFromData,
	type IntelligencePickerData,
} from '~/components/IntelligencePicker';
import { BudgetSelector } from '~/components/BudgetSelector';
import { Loading } from '~/components/Loading';
import { SkillsLink } from '~/components/SkillsLink';
import { ActionButton } from '@reactor/ui/action-button';
import { Button } from '@reactor/ui/button';
import { TooltipProvider } from '@reactor/ui/tooltip';
import { useExpandingTextarea } from '@reactor/ui/hooks/useExpandingTextarea';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';
import { useAddFile } from '~/hooks/useFileMutations';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { useVoiceRecording } from '~/hooks/useVoiceRecording';
import { api } from 'convex/_generated/api';
import { asDollars, asNumber } from 'lib/money';

const noLoopOption = {
	name: 'No loop',
	visual: {
		icon: 'circle-off',
		color: 'zinc',
		tint: 'zinc',
	},
};

const PLACEHOLDERS = [
	"What's happening?",
	"What's going on?",
	'What troubles you?',
	'What are you thinking about?',
	'Siree, look at me!',
	'What are you feeling?',
	'What are you trying to achieve?',
	'What is my purpose?',
];

const QUICK_SEEK_PLACEHOLDER_KEY = 'meseeks.quickSeek.placeholder';

declare global {
	interface Window {
		meseeksQuickSeekPlaceholder?: string;
	}
}

function getQuickSeekPlaceholder() {
	//
	const fallback = PLACEHOLDERS[0] ?? "What's happening?";
	if (typeof window === 'undefined') return fallback;

	if (window.meseeksQuickSeekPlaceholder && PLACEHOLDERS.includes(window.meseeksQuickSeekPlaceholder)) {
		return window.meseeksQuickSeekPlaceholder;
	}

	try {
		const stored = window.sessionStorage.getItem(QUICK_SEEK_PLACEHOLDER_KEY);
		if (stored && PLACEHOLDERS.includes(stored)) {
			window.meseeksQuickSeekPlaceholder = stored;
			return stored;
		}
	} catch {
		// some browser sandboxes block storage, but the window slot still survives remounts.
	}

	const next = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)] ?? fallback;
	window.meseeksQuickSeekPlaceholder = next;
	try {
		window.sessionStorage.setItem(QUICK_SEEK_PLACEHOLDER_KEY, next);
	} catch {
		// storage is only a reload convenience; the window slot is the interaction fix.
	}
	return next;
}

export function QuickSeek({ className }: { className?: string }) {
	//
	const [isAdding, setIsAdding] = useState(false);

	return (
		<div className={cn('relative h-full flex items-center justify-center', className)}>
			{!isAdding && (
				<h1 className="absolute bottom-1/2 mb-36 px-4 text-center text-3xl md:text-4xl font-semibold">
					What are you seeking?
				</h1>
			)}
			<QuickSeekContent className="w-full max-w-5xl" onAddingChange={setIsAdding} />
		</div>
	);
}

export function QuickSeekContent({
	className, //
	onAddingChange,
}: {
	className?: string;
	onAddingChange?: (isAdding: boolean) => void;
}) {
	//
	const navigate = useNavigate();
	const { addFile, isAdding } = useAddFile();
	const currentUser = useCurrentUser();

	const { q } = useSearch({ strict: false });

	const loopsQuery = convexQuery(api.loops.findAll, {});
	const intelligencesQuery = convexQuery(api.loops.intelligenceOptions, {});
	const { data: loopsData } = useSuspenseQuery(loopsQuery);
	const { data: intelligences } = useSuspenseQuery(intelligencesQuery);
	const intelligencePickerOptions = intelligencePickerOptionsFromData(intelligences);
	const seekLoop = loopsData.loops.find((loop) => loop.key === '@pro/Seek');
	const initialLoop = seekLoop ?? loopsData.loops[0];
	const [selectedLoop, setSelectedLoop] = useState<string | null>(initialLoop?.key ?? null);
	const [isLoopPanelOpen, setIsLoopPanelOpen] = useState(false);
	const [selectedIntelligence, setSelectedIntelligence] = useState(defaultIntelligenceForLoop(initialLoop));
	const spendable = currentUser.spendableBalanceUSD;
	const selectedLoopRecord = loopsData.loops.find((loop) => loop.key === selectedLoop);
	const selectedVisual = selectedLoopRecord?.visual ?? noLoopOption.visual;
	const selectedLoopName = selectedLoopRecord?.name ?? noLoopOption.name;
	const maxInitialFunds = defaultInitialFundsFor({
		spendable,
		budgetCeiling: budgetCeilingForIntelligence({
			data: intelligences,
			key: selectedIntelligence,
		}),
	});
	const [initialFunds, setInitialFunds] = useState(maxInitialFunds);

	useEffect(() => {
		if (initialFunds <= maxInitialFunds) return;

		setInitialFunds(maxInitialFunds);
	}, [initialFunds, maxInitialFunds]);

	const {
		textareaRef,
		value: message,
		isEmpty,
		onChange: handleMessageChange,
		setValue: setMessage,
	} = useExpandingTextarea({ initialValue: q || '' });

	const { recordingStatus, startRecording, stopRecording, cancelRecording } = useVoiceRecording({
		onTranscriptionComplete: setMessage,
	});
	const [placeholder] = useState(getQuickSeekPlaceholder);

	const handleStartRecording = async () => {
		try {
			await startRecording();
		} catch (error) {
			console.error('Failed to start voice recording:', error);
		}
	};

	const handleSubmit = () => {
		//
		if (isAdding) return;
		if (!message.trim()) {
			toast.error('Message is required');
			return;
		}

		const file = {
			message: message.trim(),
			initialFunds,
			loopKey: selectedLoop,
			intelligence: selectedIntelligence,
		};

		addFile(file, {
			onSuccess: (fileId) => {
				navigate({ to: '/$', params: { _splat: `tasks/${fileId}` } });
			},
			onError: (error: unknown) => {
				//
				if (isError(INSUFFICIENT_ACCOUNT_FUNDS_ERROR, error)) {
					toast.error('Account funds are insufficient.', {
						description: `Spendable energy is ${asDollars({ bigInt: spendable })}⚡. Top up or decrease the file energy budget.`,
						action: {
							label: 'Top up',
							onClick: () => navigate({ to: '/top-up' }),
						},
					});
				} else {
					toast.error('An unknown error occurred while creating the file.');
				}
			},
		});
	};

	const showVoiceInterface = recordingStatus !== 'idle';

	useEffect(() => {
		//
		onAddingChange?.(isAdding);
	}, [isAdding, onAddingChange]);

	const handleSelectNoLoop = () => {
		//
		setSelectedLoop(null);
		setSelectedIntelligence('Cheap');
		setInitialFunds(
			defaultInitialFundsFor({
				spendable,
				budgetCeiling: budgetCeilingForIntelligence({
					data: intelligences,
					key: 'Cheap',
				}),
			}),
		);
	};

	const handleSelectLoop = (loop: Doc<'loops'>) => {
		//
		const defaultIntelligence = defaultIntelligenceForLoop(loop);
		setSelectedLoop(loop.key);
		setSelectedIntelligence(defaultIntelligence);
		setInitialFunds(
			defaultInitialFundsFor({
				spendable,
				budgetCeiling: budgetCeilingForIntelligence({
					data: intelligences,
					key: defaultIntelligence,
				}),
			}),
		);
	};

	const handleSelectIntelligence = (key: string) => {
		//
		setSelectedIntelligence(key);
		setIsLoopPanelOpen(false);
		setInitialFunds(
			defaultInitialFundsFor({
				spendable,
				budgetCeiling: budgetCeilingForIntelligence({
					data: intelligences,
					key,
				}),
			}),
		);
	};

	// Handle ⌘+Enter shortcut like ActionComposer
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'Enter' },
		callback: () => {
			if (recordingStatus === 'idle' && !isEmpty && !isAdding) {
				handleSubmit();
			}
		},
	});

	// global focus shortcut (⌘+I)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'i' },
		callback: () => {
			textareaRef.current?.focus();
			// Move cursor to end of text
			const length = textareaRef.current?.value.length || 0;
			textareaRef.current?.setSelectionRange(length, length);
		},
	});

	// loop panel shortcut (⌘+/)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: '/' },
		callback: () => setIsLoopPanelOpen((value) => !value),
	});

	if (isAdding) return <Loading />;

	return (
		<div className={cn('max-h-fit p-4', className)}>
			<TooltipProvider>
				<div
					className={cn(
						'bg-sidebar rounded-3xl border p-4 shadow-xs flex flex-col',
						tintFor(selectedVisual.tint),
						showVoiceInterface && 'flex-row',
					)}
				>
					{'recording' === recordingStatus && (
						<RecordingState stopRecording={stopRecording} cancelRecording={cancelRecording} />
					)}

					{'transcribing' === recordingStatus && <TranscribingState cancelRecording={cancelRecording} />}

					{'idle' === recordingStatus && (
						<>
							{isLoopPanelOpen && (
								<div className="mb-4 grid gap-3 border-b border-border/50 px-1 pb-4 md:grid-cols-2">
									<div className="space-y-2">
										<div className="text-xs font-medium uppercase text-muted-foreground">Loop</div>
										<div className="flex flex-wrap gap-2">
											<Button
												type="button"
												variant={selectedLoop === null ? 'default' : 'secondary'}
												size="sm"
												className={
													selectedLoop === null
														? colorFor(noLoopOption.visual.color)
														: undefined
												}
												onClick={handleSelectNoLoop}
											>
												{iconFor(noLoopOption.visual.icon)}
												{noLoopOption.name}
											</Button>
											{loopsData.loops.map((loop) => (
												<Button
													type="button"
													key={loop._id}
													variant={selectedLoop === loop.key ? 'default' : 'secondary'}
													size="sm"
													className={
														selectedLoop === loop.key
															? colorFor(loop.visual.color)
															: undefined
													}
													onClick={() => handleSelectLoop(loop)}
												>
													{iconFor(loop.visual.icon)}
													{loop.name}
												</Button>
											))}
										</div>
									</div>
									<div className="space-y-2">
										<div className="text-xs font-medium uppercase text-muted-foreground">
											Intelligence
										</div>
										<IntelligencePicker
											value={selectedIntelligence}
											onChange={handleSelectIntelligence}
											options={intelligencePickerOptions.options}
											recommendedKeys={intelligencePickerOptions.recommendedKeys}
											popoverSide="top"
										/>
									</div>
								</div>
							)}

							<div className="flex items-center justify-center">
								<textarea
									ref={textareaRef}
									value={message}
									onChange={handleMessageChange}
									placeholder={placeholder}
									className="text-primary min-h-20 py-2 w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
								/>
							</div>

							<div className="flex flex-col md:flex-row gap-2 pt-2">
								{/* Budget selector - takes available space */}
								<div className="flex items-center gap-2 flex-1 md:min-w-0">
									<BudgetSelector
										value={initialFunds}
										onChange={setInitialFunds}
										label="Max. energy"
										inputTabIndex={-1}
										className="flex-1"
									/>
								</div>

								{/* Other controls and action buttons */}
								<div className="flex items-center justify-between md:justify-end gap-2 flex-shrink-0">
									<div className="flex items-center gap-2 min-w-0">
										<LoopButton
											label={selectedLoopName}
											icon={iconFor(selectedVisual.icon)}
											color={selectedVisual.color}
											isOpen={isLoopPanelOpen}
											onClick={() => setIsLoopPanelOpen((value) => !value)}
										/>
										<SkillsLink />
									</div>

									<div className="flex items-center gap-2">
										{/* Action buttons */}
										<ActionButton
											icon={<Mic className="size-5" />}
											onClick={handleStartRecording}
											disabled={isAdding}
											tooltip="Transcribe voice"
											variant="secondary"
										/>
										<ActionButton
											icon={<ArrowUp className="size-5" />}
											onClick={handleSubmit}
											disabled={isEmpty || isAdding}
											tooltip="Seek"
										/>
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</TooltipProvider>
		</div>
	);
}

function LoopButton({
	label,
	icon,
	color,
	isOpen,
	onClick,
}: {
	label: string;
	icon: ReactNode;
	color: string;
	isOpen: boolean;
	onClick: () => void;
}) {
	return (
		<Button type="button" variant="secondary" onClick={onClick} className={cn('shrink-0', colorFor(color))}>
			{icon}
			{label}
			<ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-180')} />
		</Button>
	);
}

function defaultIntelligenceForLoop(loop: Doc<'loops'> | undefined) {
	//
	return loop?.defaultIntelligenceKey ?? 'Cheap';
}

function budgetCeilingForIntelligence(args: { data: IntelligencePickerData; key: string }) {
	//
	return args.data.recommended.find((choice) => choice.key === args.key)?.budgetCeiling ?? null;
}

function defaultInitialFundsFor(args: { spendable: bigint; budgetCeiling: bigint | null }) {
	//
	const spendableNumber = asNumber({ bigInt: args.spendable });
	if (spendableNumber < 0.02) return 0;

	const ceiling = args.budgetCeiling ?? args.spendable;
	return Math.min(asNumber({ bigInt: ceiling }), spendableNumber);
}

function iconFor(icon: string) {
	//
	if (icon === 'circle-off') return <CircleOff className="size-4" />;
	if (icon === 'message-circle') return <MessageCircle className="size-4" />;
	if (icon === 'telescope' || icon === 'compass' || icon === 'radar') return <Radar className="size-4" />;

	return <CircleOff className="size-4" />;
}

function colorFor(color: string) {
	//
	if (color === 'emerald') {
		return '!border-emerald-500/60 !bg-emerald-600 !text-white hover:!bg-emerald-700 dark:!bg-emerald-400 dark:!text-emerald-950 dark:hover:!bg-emerald-300';
	}
	if (color === 'sky') {
		return '!border-sky-500/60 !bg-sky-600 !text-white hover:!bg-sky-700 dark:!bg-sky-400 dark:!text-sky-950 dark:hover:!bg-sky-300';
	}
	if (color === 'violet') {
		return '!border-violet-500/60 !bg-violet-600 !text-white hover:!bg-violet-700 dark:!bg-violet-400 dark:!text-violet-950 dark:hover:!bg-violet-300';
	}
	if (color === 'zinc') {
		return '!border-zinc-500/60 !bg-zinc-900 !text-zinc-50 hover:!bg-zinc-800 dark:!bg-zinc-100 dark:!text-zinc-950 dark:hover:!bg-zinc-200';
	}

	return undefined;
}

function tintFor(tint: string) {
	//
	if (tint === 'emerald') return 'border-emerald-500/40 bg-emerald-500/5';
	if (tint === 'sky') return 'border-sky-500/40 bg-sky-500/5';
	if (tint === 'violet') return 'border-violet-500/40 bg-violet-500/5';
	if (tint === 'zinc') return 'border-zinc-500/30 bg-zinc-500/5';

	return undefined;
}

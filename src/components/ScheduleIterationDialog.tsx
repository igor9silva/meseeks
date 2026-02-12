import { Id } from 'convex/_generated/dataModel';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { getNextDates } from 'lib/cron';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { LoadingButton } from '~/components/ui/loading-button';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Textarea } from '~/components/ui/textarea';
import { useSubmitHotkey } from '~/hooks/useSubmitHotkey';
import { useScheduleIteration } from '~/hooks/useTaskMutations';

interface ScheduleIterationDialogProps {
	//
	taskId: Id<'tasks'>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ScheduleIterationDialog({ taskId, open, onOpenChange }: ScheduleIterationDialogProps) {
	//
	const { scheduleIteration, isSchedulingIteration } = useScheduleIteration();
	const submitHotkey = useSubmitHotkey();

	// Initialize with current date/time + 15 minutes
	const now = new Date();
	const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);
	const defaultDate = fifteenMinutesLater.toISOString().split('T')[0];
	const defaultTime = fifteenMinutesLater.toTimeString().slice(0, 5);

	const [scheduleType, setScheduleType] = useState<'one-time' | 'recurring'>('one-time');
	const [scheduledDate, setScheduledDate] = useState(defaultDate);
	const [scheduledTime, setScheduledTime] = useState(defaultTime);
	const [cronExpression, setCronExpression] = useState('0 9 * * 1'); // every Monday at 9:00 AM
	const [instructions, setInstructions] = useState('');

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	// Compute next execution dates for cron preview
	const nextCronDates = useMemo(() => {
		//
		if (scheduleType === 'recurring' && cronExpression.trim()) {
			try {
				return { dates: getNextDates(cronExpression, timeZone, 5), error: null };
			} catch (error) {
				return { dates: [], error: 'Invalid expression' };
			}
		}

		return { dates: [], error: null };
		//
	}, [cronExpression, timeZone, scheduleType]);

	// Check if current selection matches a quick option
	const isOptionActive = (option: (typeof quickOptions)[number]) => {
		//
		const optionValue = option.getValue();

		const currentDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
		const optionDateTime = new Date(`${optionValue.date}T${optionValue.time}`);

		const timeDiff = Math.abs(currentDateTime.getTime() - optionDateTime.getTime());

		return timeDiff < 60 * 1000; // within 1 minute tolerance
	};

	const handleQuickOption = (option: (typeof quickOptions)[number]) => {
		//
		const { date, time } = option.getValue();

		setScheduledDate(date);
		setScheduledTime(time);
	};

	const handleSubmit = async (e?: React.FormEvent) => {
		//
		if (e) e.preventDefault();
		if (isSchedulingIteration) return;

		try {
			//
			const scheduleArgs: Parameters<typeof scheduleIteration>[number] = {
				taskId,
				scheduleType,
				timeZone,
			};

			// Add instructions if provided
			if (instructions.trim()) {
				scheduleArgs.instructions = instructions.trim();
			}

			if (scheduleType === 'one-time') {
				//
				const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
				scheduleArgs.scheduledAt = dateTime.toISOString();
				//
			} else {
				//
				scheduleArgs.cronExpression = cronExpression;
			}

			scheduleIteration(scheduleArgs, {
				onSuccess: () => {
					onOpenChange(false);
					// Reset form to defaults
					setScheduledDate(defaultDate);
					setScheduledTime(defaultTime);
					setCronExpression('0 9 * * 1');
					setInstructions('');
					setScheduleType('one-time');
				},
			});
		} catch (error) {
			console.error('Failed to schedule iteration:', error);
		}
	};

	const isOneTimeValid = scheduleType === 'one-time' && scheduledDate && scheduledTime;
	const isRecurringValid = scheduleType === 'recurring' && cronExpression.trim();
	const canSubmit = (isOneTimeValid || isRecurringValid) && !isSchedulingIteration;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<form onSubmit={handleSubmit} onKeyDown={submitHotkey}>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<CalendarIcon className="size-5" />
							Schedule Iteration
						</DialogTitle>
						<DialogDescription>
							Schedule this task to iterate automatically at specific times.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						<div className="space-y-3">
							<Label></Label>
							<RadioGroup
								value={scheduleType}
								onValueChange={(value) => setScheduleType(value as 'one-time' | 'recurring')}
								className="flex gap-6"
							>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="one-time" id="one-time" />
									<Label htmlFor="one-time">One-time</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="recurring" id="recurring" />
									<Label htmlFor="recurring">Recurring</Label>
								</div>
							</RadioGroup>
						</div>

						{scheduleType === 'one-time' && (
							<div className="space-y-4">
								<div className="space-y-3">
									<Label className="text-sm font-medium">Quick options</Label>
									<div className="flex gap-2">
										{quickOptions.map((option) => (
											<Button
												key={option.label}
												type="button"
												variant={isOptionActive(option) ? 'default' : 'outline'}
												size="sm"
												onClick={() => handleQuickOption(option)}
												className="flex-1"
											>
												{option.label}
											</Button>
										))}
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="date">Date</Label>
										<Input
											id="date"
											type="date"
											value={scheduledDate}
											onChange={(e) => setScheduledDate(e.target.value)}
											className="[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert-0 dark:[&::-webkit-calendar-picker-indicator]:invert"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="time">Time</Label>
										<Input
											id="time"
											type="time"
											value={scheduledTime}
											onChange={(e) => setScheduledTime(e.target.value)}
											className="[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert-0 dark:[&::-webkit-calendar-picker-indicator]:invert"
										/>
									</div>
								</div>

								<div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full px-3 py-2">
									<ClockIcon className="size-4" />
									<span>Timezone: {timeZone}</span>
								</div>
							</div>
						)}

						{scheduleType === 'recurring' && (
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="cron">Cron Expression</Label>
									<Input
										id="cron"
										value={cronExpression}
										onChange={(e) => setCronExpression(e.target.value)}
										placeholder="0 9 * * 1"
										className="font-mono text-sm"
									/>
									<div className="text-sm text-muted-foreground font-mono ml-4">
										<div>│ │ │ │ │</div>
										<div>│ │ │ │ └─── Day of Week (0-7)</div>
										<div>│ │ │ └───── Month (1-12)</div>
										<div>│ │ └─────── Day of Month (1-31)</div>
										<div>│ └───────── Hour (0-23)</div>
										<div>└─────────── Minute (0-59)</div>
									</div>
								</div>

								{nextCronDates.dates.length > 0 && (
									<div className="space-y-2">
										<Label className="text-sm font-medium">Next 5 executions</Label>
										<div className="bg-muted/50 rounded-full px-3 py-3 space-y-1">
											{nextCronDates.dates.map((date, index) => (
												<div key={index} className="text-sm font-mono">
													{date.toLocaleString('en-US', {
														timeZone,
														weekday: 'short',
														month: 'short',
														day: 'numeric',
														hour: 'numeric',
														minute: '2-digit',
														year: 'numeric',
														hour12: true,
													})}
												</div>
											))}
										</div>
									</div>
								)}

								{nextCronDates.error && (
									<div className="space-y-2">
										<div className="bg-destructive text-destructive-foreground rounded-full px-3 py-2 text-sm">
											{nextCronDates.error}
										</div>
									</div>
								)}

								<div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full px-3 py-2">
									<ClockIcon className="size-4" />
									<span>Timezone: {timeZone}</span>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="instructions">Instructions (optional)</Label>
							<Textarea
								id="instructions"
								value={instructions}
								onChange={(e) => setInstructions(e.target.value)}
								placeholder="Specific instructions for what to do when this schedule runs (e.g., 'Generate daily sales report', 'Send weekly project update')"
								className="resize-none"
								rows={3}
							/>
							<p className="text-xs text-muted-foreground">
								Provide context about what should happen when this schedule triggers
							</p>
						</div>

						<div className="flex justify-end gap-3 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isSchedulingIteration}
							>
								Cancel
							</Button>
							<LoadingButton
								type="submit"
								disabled={!canSubmit}
								loading={isSchedulingIteration}
								loadingText="Scheduling..."
							>
								Schedule
							</LoadingButton>
						</div>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

const quickOptions = [
	{
		label: 'in 15min',
		getValue: () => {
			const target = new Date(Date.now() + 15 * 60 * 1000);
			return {
				date: target.toISOString().split('T')[0],
				time: target.toTimeString().slice(0, 5),
			};
		},
	},
	{
		label: 'in 1 hour',
		getValue: () => {
			const target = new Date(Date.now() + 60 * 60 * 1000);
			return {
				date: target.toISOString().split('T')[0],
				time: target.toTimeString().slice(0, 5),
			};
		},
	},
	{
		label: 'Tomorrow 9AM',
		getValue: () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(9, 0, 0, 0);
			return {
				date: tomorrow.toISOString().split('T')[0],
				time: '09:00',
			};
		},
	},
];

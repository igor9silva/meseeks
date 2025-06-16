import { Id } from 'convex/_generated/dataModel';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Textarea } from '~/components/ui/textarea';
import { useSubmitHotkey } from '~/hooks/useSubmitHotkey';
import { useTaskMutations } from '~/hooks/useTaskMutations';

interface ScheduleIterationDialogProps {
	//
	taskId: Id<'tasks'>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ScheduleIterationDialog({ taskId, open, onOpenChange }: ScheduleIterationDialogProps) {
	//
	const { scheduleIteration } = useTaskMutations();
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
	const [isLoading, setIsLoading] = useState(false);

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
		setIsLoading(true);

		try {
			//
			const scheduleArgs: Parameters<typeof scheduleIteration>[number] = {
				taskId,
				scheduleType,
				timeZone,
			};

			if (scheduleType === 'one-time') {
				//
				const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
				scheduleArgs.scheduledAt = dateTime.toISOString();
				//
			} else {
				//
				scheduleArgs.cronExpression = cronExpression;
			}

			await scheduleIteration(scheduleArgs);
			onOpenChange(false);

			// Reset form to defaults
			setScheduledDate(defaultDate);
			setScheduledTime(defaultTime);
			setCronExpression('0 9 * * 1');
			setScheduleType('one-time');
			//
		} finally {
			//
			setIsLoading(false);
		}
	};

	const isOneTimeValid = scheduleType === 'one-time' && scheduledDate && scheduledTime;
	const isRecurringValid = scheduleType === 'recurring' && cronExpression.trim();
	const canSubmit = (isOneTimeValid || isRecurringValid) && !isLoading;

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

								<div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
									<ClockIcon className="size-4" />
									<span>Timezone: {timeZone}</span>
								</div>
							</div>
						)}

						{scheduleType === 'recurring' && (
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="cron">Cron Expression</Label>
									<Textarea
										id="cron"
										value={cronExpression}
										onChange={(e) => setCronExpression(e.target.value)}
										placeholder="0 9 * * 1"
										className="font-mono text-sm resize-none"
										rows={2}
									/>
									<p className="text-xs text-muted-foreground">
										Example: "0 9 * * 1" = Every Monday at 9:00 AM
									</p>
								</div>

								<div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
									<ClockIcon className="size-4" />
									<span>Timezone: {timeZone}</span>
								</div>
							</div>
						)}

						<div className="flex justify-end gap-3 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isLoading}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!canSubmit}>
								{isLoading ? 'Scheduling...' : 'Schedule'}
							</Button>
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

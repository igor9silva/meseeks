import { useLocation } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { userRequestSchema } from 'schemas/userSchema';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod/v3';
import { Button } from '@reactor/ui/button';
import { api } from 'convex/_generated/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@reactor/ui/dialog';
import { Textarea } from '@reactor/ui/textarea';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { useHandleSubmit } from '@reactor/ui/hooks/useHandleSubmit';
import { useSplatParams } from '~/hooks/useSplatParams';
import { useSubmitHotkey } from '@reactor/ui/hooks/useSubmitHotkey';

const MESSAGE_MAX_LENGTH = userRequestSchema.shape.message.maxLength || 1000;

/**
 * Dialog for users to submit feedback
 */
export function FeedbackDialog({
	className,
	open,
	onOpenChange,
}: {
	className?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	//
	const [message, setMessage] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const submit = useMutation(api.users.requests.submit);
	const submitHotkey = useSubmitHotkey();

	const { pathname, searchStr } = useLocation();
	const { taskId } = useSplatParams();
	const user = useCurrentUser();

	const gatherContext = () => {
		return {
			timestamp: new Date().toISOString(),
			currentPath: pathname + searchStr,
			currentTaskId: taskId || null,
			userAgent: navigator.userAgent,
			viewportSize: {
				width: window.innerWidth,
				height: window.innerHeight,
			},
			devicePixelRatio: window.devicePixelRatio,
			userInfo: {
				id: user._id,
				email: user.email,
				isFounder: user.isFounder,
			},
		};
	};

	const handleSubmit = useHandleSubmit({
		schema: z.object({
			message: userRequestSchema.shape.message,
		}),
		onParseError: () => {
			toast.error('Please check your input and try again');
		},
		handler: async (data, clearForm) => {
			//
			setIsSubmitting(true);

			try {
				await submit({
					key: 'feedback',
					message: data.message.trim(),
					context: gatherContext(),
				});

				toast.success('Feedback submitted! Thanks for helping us improve.');

				clearForm();
				setMessage('');
				onOpenChange(false);
				//
			} catch (error) {
				console.error('Error submitting feedback:', error);
				toast.error('Failed to submit feedback. Please try again later.');
			}

			setIsSubmitting(false);
		},
	});

	const remainingChars = MESSAGE_MAX_LENGTH - message.length;
	const isOverLimit = remainingChars < 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={className}>
				<form onSubmit={handleSubmit} onKeyDown={submitHotkey}>
					<DialogHeader>
						<DialogTitle>Send feedback</DialogTitle>
						<DialogDescription>
							Help us improve Meseeks! Share your thoughts, report bugs, or suggest new features.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Textarea
							name="message"
							placeholder="Tell us what you think..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							className="min-h-32"
							disabled={isSubmitting}
						/>
						<div
							className={`text-xs mt-2 text-right ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}
						>
							{remainingChars} characters remaining
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || isOverLimit || !message.trim()}>
							{isSubmitting ? 'Sending...' : 'Send feedback'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

import { Doc } from 'convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { userRequestSchema } from 'schemas/userSchema';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod/v3';
import { Button } from '@reactor/ui/button';
import { api } from 'convex/_generated/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@reactor/ui/dialog';
import { Textarea } from '@reactor/ui/textarea';
import { useHandleSubmit } from '@reactor/ui/hooks/useHandleSubmit';
import { useSubmitHotkey } from '@reactor/ui/hooks/useSubmitHotkey';

const MESSAGE_MAX_LENGTH = userRequestSchema.shape.message.maxLength || 1000;

/**
 * Dialog for requesting access to share skills
 */
export function ShareSkillRequestDialog({
	skill,
	open,
	onOpenChange,
}: {
	skill: Doc<'skills'> | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	//
	const [message, setMessage] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submit = useMutation(api.users.requests.submit);
	const submitHotkey = useSubmitHotkey();

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
					key: 'share_skills',
					message: data.message.trim(),
				});

				toast.success('Request submitted');

				clearForm();
				setMessage('');
				onOpenChange(false);
				//
			} catch (error) {
				console.error('Error submitting request:', error);
				toast.error('Failed to submit request. Please try again later.');
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	if (!skill) return null;

	const remainingChars = MESSAGE_MAX_LENGTH - message.length;
	const isOverLimit = remainingChars < 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={handleSubmit} onKeyDown={submitHotkey}>
					<DialogHeader>
						<DialogTitle>Sharing skills is in limited preview</DialogTitle>
						<DialogDescription>
							Fill below to request access.
							<br />
							<br />
							Sharing skills lets other users use skills you taught PRO (for free, or for a fee — it's up
							to you)!
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Textarea
							name="message"
							placeholder="Tell us about your research, product, the use cases you have in mind, or anything else."
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
							{isSubmitting ? 'Submitting...' : 'Request access'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

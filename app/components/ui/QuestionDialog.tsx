import { api } from 'convex/_generated/api';
import { useMutation } from 'convex/react';
import { userRequestSchema } from 'convex/schemas/userSchema';
import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog';
import { Textarea } from '~/components/ui/textarea';
import { useHandleSubmit } from '~/hooks/useHandleSubmit';
import { useSubmitHotkey } from '~/hooks/useSubmitHotkey';

const MESSAGE_MAX_LENGTH = userRequestSchema.shape.message.maxLength || 1000;

/**
 * Dialog for users to ask their own questions when FAQ isn't enough
 */
export function QuestionDialog({ className }: { className?: string }) {
	//
	const [message, setMessage] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [open, setOpen] = useState(false);
	const submit = useMutation(api.users.requests.public.submitRequest);
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
					key: 'general_question',
					message: data.message.trim(),
				});

				toast.success("Question submitted! We'll get back to you soon.");

				clearForm();
				setMessage('');
				setOpen(false);
				//
			} catch (error) {
				console.error('Error submitting question:', error);
				toast.error('Failed to submit question. Please try again later.');
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	const remainingChars = MESSAGE_MAX_LENGTH - message.length;
	const isOverLimit = remainingChars < 0;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<MessageCircle className="w-4 h-4 mr-2" />
					Ask a question
				</Button>
			</DialogTrigger>
			<DialogContent className={className}>
				<form onSubmit={handleSubmit} onKeyDown={submitHotkey}>
					<DialogHeader>
						<DialogTitle>Ask us anything</DialogTitle>
						<DialogDescription>
							We're here to help! Send us your question and{' '}
							<strong>we'll get back to you as soon as possible</strong>.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Textarea
							name="message"
							placeholder="What would you like to know about Meseeks?"
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
						<Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || isOverLimit || !message.trim()}>
							{isSubmitting ? 'Sending...' : 'Send question'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

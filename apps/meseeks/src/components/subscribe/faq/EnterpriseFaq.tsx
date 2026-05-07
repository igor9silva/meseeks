import { api } from 'convex/_generated/api';
import { useMutation } from 'convex/react';
import { userRequestSchema } from 'schemas/userSchema';
import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod/v3';
import { Button } from '@reactor/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@reactor/ui/dialog';
import { Textarea } from '@reactor/ui/textarea';
import { useHandleSubmit } from '@reactor/ui/hooks/useHandleSubmit';
import { useSubmitHotkey } from '@reactor/ui/hooks/useSubmitHotkey';

const MESSAGE_MAX_LENGTH = userRequestSchema.shape.message.maxLength || 1000;

export const EnterpriseFaq = {
	//
	question: 'Do you offer enterprise plans?',
	answer: (
		<div className="space-y-3 text-muted-foreground leading-relaxed">
			<p>Not yet.</p>
			<EnterpriseEarlyAccessDialog />
		</div>
	),
};

function EnterpriseEarlyAccessDialog() {
	//
	const [message, setMessage] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [open, setOpen] = useState(false);

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
					key: 'enterprise_early_access',
					message: data.message.trim(),
				});

				toast.success("Request submitted! We'll contact you about enterprise early access.");

				clearForm();
				setMessage('');
				setOpen(false);
				//
			} catch (error) {
				console.error('Error submitting enterprise request:', error);
				toast.error('Failed to submit request. Please try again later.');
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
				<Button variant="secondary" size="sm">
					<Building2 className="w-4 h-4 mr-2" />
					Request early access
				</Button>
			</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit} onKeyDown={submitHotkey}>
					<DialogHeader>
						<DialogTitle>Enterprise Early Access</DialogTitle>
						<DialogDescription>
							Tell us about your enterprise needs and we'll reach out to discuss how Meseeks can work for
							your organization.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Textarea
							name="message"
							placeholder="Tell us about your company size, use case, and specific requirements..."
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
							{isSubmitting ? 'Sending...' : 'Submit request'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

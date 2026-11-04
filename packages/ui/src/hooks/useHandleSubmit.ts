import { type FormEvent } from 'react';
import { type z } from 'zod';

export function useHandleSubmit<T extends z.ZodType>({
	schema,
	handler,
	shouldAlwaysClearForm = true,
	onParseError,
}: {
	schema: T;
	shouldAlwaysClearForm?: boolean;
	handler: (data: z.infer<T>, clearForm: () => void) => Promise<void> | void;
	onParseError?: (error: z.ZodError) => void;
}) {
	return async (e: FormEvent<HTMLFormElement>) => {
		//
		e.preventDefault();
		const target = e.currentTarget;
		const formData = new FormData(target);

		// Convert FormData to a plain object
		const rawData = Object.fromEntries(formData);

		// Parse the data
		const parsed = schema.safeParse(rawData);

		if (!parsed.success) {
			onParseError?.(parsed.error);
			return;
		}

		// Reset the form
		if (shouldAlwaysClearForm) target.reset();

		await handler(parsed.data, () => target.reset());
	};
}

import { useMutation } from '@tanstack/react-query';
import { Doc } from 'convex/_generated/dataModel';

export class PaymentError extends Error {
	constructor(
		message: string,
		public code: string,
	) {
		super(message);
	}
}

export const usePayment = (record: { paymentUrl: string } | Doc<'topUps'> | Doc<'subscriptions'>) => {
	//
	const { mutate, isPending, error } = useMutation({
		mutationFn: async () => {
			location.href = record.paymentUrl;
		},
	});

	return { pay: mutate, isPending, error };
};

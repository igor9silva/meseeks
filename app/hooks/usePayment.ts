import { useMutation } from '@tanstack/react-query';

export class PaymentError extends Error {
	constructor(
		message: string,
		public code: string,
	) {
		super(message);
	}
}

export const usePayment = (record: { paymentUrl: string }) => {
	//
	const { mutate, isPending, error } = useMutation({
		mutationFn: async () => {
			location.href = record.paymentUrl;
		},
	});

	return { pay: mutate, isPending, error };
};

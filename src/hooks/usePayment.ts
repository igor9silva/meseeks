import { useMutation } from '@tanstack/react-query';

export const usePayment = (record: { paymentUrl: string }) => {
	//
	const { mutate, isPending, error } = useMutation({
		mutationFn: async () => {
			location.href = record.paymentUrl;
		},
	});

	return { pay: mutate, isPending, error };
};

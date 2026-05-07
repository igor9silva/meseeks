import { useMutation } from '@tanstack/react-query';

export const usePayment = (record: { paymentUrl: string }) => {
	//
	const { mutate, isPending, error } = useMutation({
		mutationFn: async () => {
			window.location.href = record.paymentUrl;
		},
	});

	return { pay: mutate, isPending, error };
};

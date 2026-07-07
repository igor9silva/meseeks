import { useMutation } from '@tanstack/react-query';

export function usePayment({ paymentUrl }: { paymentUrl: string }) {
	//
	const { mutate, isPending, error } = useMutation({
		mutationFn: async () => {
			if (!paymentUrl) throw new Error('Payment URL is missing.');
			window.location.href = paymentUrl;
		},
	});

	return { pay: mutate, isPending, error };
}

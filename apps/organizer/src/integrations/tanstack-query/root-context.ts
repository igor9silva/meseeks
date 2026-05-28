import { QueryClient } from '@tanstack/react-query';

let context:
	| {
			queryClient: QueryClient;
	  }
	| undefined;

export function getContext() {
	if (context) {
		return context;
	}

	const queryClient = new QueryClient();

	context = {
		queryClient,
	};

	return context;
}

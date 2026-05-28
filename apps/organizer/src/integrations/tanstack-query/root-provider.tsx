import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { getContext } from './root-context';

export default function TanStackQueryProvider({ children }: { children: ReactNode }) {
	const { queryClient } = getContext();

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

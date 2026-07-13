import type { ReactNode } from 'react';

export function NotFound({ children }: { children?: ReactNode }) {
	return children || <p>What you are looking for doesn't seem to exist.</p>;
}

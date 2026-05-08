import type { ErrorComponentProps } from '@tanstack/react-router';
import { ErrorComponent } from '@tanstack/react-router';

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
	//
	console.error(error);

	// TODO: stop showing this error
	return <ErrorComponent error={error} />;
}

import type { ReactNode } from 'react';
import { OrganizerHeader, usePrivateTaskBlur } from '~/components/tasks/OrganizerHeader';

export function TagsShell({ children }: { children: ReactNode }) {
	//
	const { shouldBlurPrivateTasks, togglePrivateBlur } = usePrivateTaskBlur();

	return (
		<main className="flex h-screen flex-col bg-background text-foreground">
			<OrganizerHeader
				breadcrumbs={[
					{ href: '/', label: 'Organizer' },
					{ href: '/tags', label: 'Tags' },
				]}
				shouldBlurPrivateTasks={shouldBlurPrivateTasks}
				onPrivateBlurToggle={togglePrivateBlur}
			/>
			<div className="min-h-0 flex-1 overflow-auto">
				<div className="flex w-full max-w-none flex-col gap-6 p-6">{children}</div>
			</div>
		</main>
	);
}

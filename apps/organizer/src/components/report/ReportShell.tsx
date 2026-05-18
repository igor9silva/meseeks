import type { ReactNode } from 'react';
import { OrganizerHeader, usePrivateTaskBlur } from '~/components/tasks/OrganizerHeader';

export function ReportShell({ title, children }: { title: string; children: ReactNode }) {
	//
	const { shouldBlurPrivateTasks, togglePrivateBlur } = usePrivateTaskBlur();

	return (
		<main className="flex h-screen flex-col bg-background text-foreground">
			<OrganizerHeader
				breadcrumbs={[
					{ href: '/', label: 'Organizer' },
					{ href: '/report', label: title },
				]}
				shouldBlurPrivateTasks={shouldBlurPrivateTasks}
				onPrivateBlurToggle={togglePrivateBlur}
			/>
			<div className="min-h-0 flex-1 overflow-auto">
				<div className="flex w-full max-w-none flex-col gap-4 px-4 py-4 lg:px-6">
					{typeof children === 'string' ? (
						<div className="text-sm text-muted-foreground">{children}</div>
					) : (
						children
					)}
				</div>
			</div>
		</main>
	);
}

import { Button, cn } from '@reactor/ui';
import { ArrowLeft, Eye, EyeOff, Inbox, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TaskSource } from '~/lib/explorerSearchParams';
import { formatSourceLabel } from './taskExplorerUtils';

const PRIVATE_VISIBILITY_STORAGE_KEY = 'organizer.shouldBlurPrivateTasks';

export interface OrganizerHeaderCrumb {
	href: string;
	label: string;
}

interface OrganizerHeaderProps {
	breadcrumbs?: OrganizerHeaderCrumb[];
	currentPath?: string;
	currentSource?: TaskSource | null;
	currentTitle?: string | null;
	onCreateTaskOpen?: () => void;
	onPrivateBlurToggle: () => void;
	shouldBlurPrivateTasks: boolean;
}

export function usePrivateTaskBlur() {
	//
	const [shouldBlurPrivateTasks, setShouldBlurPrivateTasks] = useState(false);

	useEffect(() => {
		setShouldBlurPrivateTasks(readShouldBlurPrivateTasks());
	}, []);

	const togglePrivateBlur = () => {
		setShouldBlurPrivateTasks((currentValue) => {
			const nextValue = !currentValue;
			writeShouldBlurPrivateTasks(nextValue);
			return nextValue;
		});
	};

	return { shouldBlurPrivateTasks, togglePrivateBlur };
}

export function OrganizerHeader({
	breadcrumbs,
	currentPath = '',
	currentSource = null,
	currentTitle = null,
	onCreateTaskOpen,
	onPrivateBlurToggle,
	shouldBlurPrivateTasks,
}: OrganizerHeaderProps) {
	//
	return (
		<header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-card/95 px-2">
			<div className="flex items-center gap-1">
				<Button
					type="button"
					size="action"
					variant="ghost"
					aria-label="Go back"
					title="Go back"
					onClick={() => window.history.back()}
					className="rounded-md p-2 [&_svg]:size-5"
				>
					<ArrowLeft />
				</Button>
				<a
					href="/"
					aria-label="Organizer root"
					title="Organizer root"
					className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground/80 hover:bg-accent hover:text-foreground"
				>
					<Inbox className="size-5" />
				</a>
			</div>

			<div className="relative flex h-9 min-w-0 flex-1 items-center rounded-md border border-border/80 bg-background/70 pl-9 pr-3 text-sm text-muted-foreground">
				<Search className="pointer-events-none absolute left-3 size-4" aria-hidden="true" />
				<OrganizerBreadcrumbs
					breadcrumbs={breadcrumbs}
					currentSource={currentSource}
					currentPath={currentPath}
					currentTitle={currentTitle}
				/>
			</div>

			<div className="flex items-center gap-1">
				<nav className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
					<a href="/report" className="rounded px-1.5 py-1 hover:bg-accent hover:text-foreground">
						report
					</a>
					<a href="/tags" className="rounded px-1.5 py-1 hover:bg-accent hover:text-foreground">
						tags
					</a>
				</nav>
				<Button
					type="button"
					size="action"
					variant={shouldBlurPrivateTasks ? 'secondary' : 'ghost'}
					aria-pressed={shouldBlurPrivateTasks}
					aria-label={shouldBlurPrivateTasks ? 'Show private task content' : 'Blur private task content'}
					title={shouldBlurPrivateTasks ? 'Show private task content' : 'Blur private task content'}
					onClick={onPrivateBlurToggle}
					className="rounded-md p-2"
				>
					{shouldBlurPrivateTasks ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
				</Button>
				{onCreateTaskOpen ? (
					<Button type="button" size="sm" onClick={onCreateTaskOpen} className="rounded-md">
						<Plus className="size-4" />
						New
					</Button>
				) : null}
			</div>
		</header>
	);
}

function readShouldBlurPrivateTasks(): boolean {
	//
	if (typeof window === 'undefined') return false;
	return window.localStorage.getItem(PRIVATE_VISIBILITY_STORAGE_KEY) === 'true';
}

function writeShouldBlurPrivateTasks(value: boolean): void {
	//
	window.localStorage.setItem(PRIVATE_VISIBILITY_STORAGE_KEY, value ? 'true' : 'false');
}

function OrganizerBreadcrumbs({
	breadcrumbs,
	currentSource,
	currentPath,
	currentTitle,
}: {
	breadcrumbs: OrganizerHeaderCrumb[] | undefined;
	currentSource: TaskSource | null;
	currentPath: string;
	currentTitle: string | null;
}) {
	//
	const crumbs = breadcrumbs ?? buildTaskBreadcrumbs(currentSource, currentPath);

	return (
		<div className="flex min-w-0 items-center gap-1 overflow-hidden">
			{crumbs.map((crumb, index) => {
				const isLastCrumb = index === crumbs.length - 1;
				const label = isLastCrumb && currentTitle ? currentTitle : crumb.label;

				return (
					<span key={crumb.href} className="inline-flex min-w-0 items-center gap-1">
						{index > 0 ? <span className="text-muted-foreground/60">/</span> : null}
						<a
							href={crumb.href}
							className={cn(
								'truncate rounded-sm underline-offset-4 hover:text-foreground hover:underline',
								isLastCrumb ? 'text-foreground' : 'text-muted-foreground',
							)}
						>
							{label}
						</a>
					</span>
				);
			})}
		</div>
	);
}

function buildTaskBreadcrumbs(currentSource: TaskSource | null, currentPath: string): OrganizerHeaderCrumb[] {
	//
	const crumbs: OrganizerHeaderCrumb[] = [
		{
			href: '/',
			label: 'Organizer',
		},
	];

	if (currentSource === null) return crumbs;

	crumbs.push({
		href: `/${currentSource}`,
		label: formatSourceLabel(currentSource),
	});

	const segments = currentPath.length === 0 ? [] : currentPath.split('/');
	let pathCursor = '';

	for (const segment of segments) {
		pathCursor = pathCursor.length === 0 ? segment : `${pathCursor}/${segment}`;
		crumbs.push({
			href: `/${currentSource}/${pathCursor}`,
			label: segment,
		});
	}

	return crumbs;
}

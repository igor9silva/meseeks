export function getPrivateBlurClassName(shouldBlur: boolean): string {
	//
	return shouldBlur ? 'select-none blur-xs' : '';
}

export function getPriorityBorderClassName(priority: string | null): string {
	//
	if (priority === 'critical') return 'border-l-red-500';
	if (priority === 'high') return 'border-l-orange-400';
	if (priority === 'medium') return 'border-l-yellow-400';
	if (priority === 'low') return 'border-l-blue-400';

	return 'border-l-transparent';
}

export function getPriorityClassName(priority: string): string {
	//
	if (priority === 'critical') return 'bg-red-500/20 text-red-100';
	if (priority === 'high') return 'bg-orange-500/20 text-orange-100';
	if (priority === 'medium') return 'bg-yellow-500/20 text-yellow-100';
	if (priority === 'low') return 'bg-blue-500/20 text-blue-100';

	return 'bg-muted text-muted-foreground';
}

export function getTagClassName(tag: string): string {
	//
	if (tag.startsWith('status:')) return 'bg-sky-500/20 text-sky-100';
	if (tag.startsWith('source:')) return 'bg-yellow-500/20 text-yellow-100';
	if (tag.startsWith('ticktick-')) return 'bg-violet-500/20 text-violet-100';
	if (tag === 'security') return 'bg-red-500/20 text-red-100';
	if (tag === 'ux') return 'bg-cyan-500/20 text-cyan-100';
	if (tag === 'tech') return 'bg-emerald-500/20 text-emerald-100';

	return 'bg-muted text-muted-foreground';
}

export function formatTaskDate(epochMs: number): string {
	//
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
	}).format(new Date(epochMs));
}

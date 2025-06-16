import { formatDistanceToNow } from 'date-fns';
import { cn } from '~/lib/utils';

export function TimeAgo({
	date, //
	prefix,
	withSuffix = true,
	suffix = 'ago',
	className,
}: {
	date: number | Date;
	withSuffix?: boolean;
	prefix?: string;
	suffix?: string;
	className?: string;
}) {
	return (
		<span className={cn('', className)} title={new Date(date).toISOString()}>
			{prefix && prefix + ' '}
			{formatDistanceToNow(new Date(date), { addSuffix: withSuffix && suffix === 'ago' })}
			{suffix && suffix !== 'ago' && ' ' + suffix}
		</span>
	);
}

import { cn } from '~/lib/utils';

export function FeatureItem({
	text, //
	icon: Icon,
	className,
}: {
	text: string;
	icon: React.ComponentType<{ className?: string }>;
	className?: string;
}) {
	return (
		<li className={cn('flex items-center gap-3', className)}>
			<Icon className="w-5 h-5 text-green-500 flex-shrink-0" />
			<span>{text}</span>
		</li>
	);
}

import { formatTaskTimestamp, getPrivateBlurClassName } from './taskDetailUtils';

export function TimestampButton({
	label,
	value,
	shouldBlur,
	onCopy,
}: {
	label: string;
	value: string;
	shouldBlur: boolean;
	onCopy: (value: string) => Promise<void>;
}) {
	//
	const privateBlurClassName = getPrivateBlurClassName(shouldBlur);

	return (
		<button
			type="button"
			onClick={() => {
				void onCopy(value);
			}}
			className="min-w-36 text-left hover:text-foreground"
			title={`Copy ${value}`}
		>
			<div className="text-muted-foreground">{label}</div>
			<div className={`mt-0.5 truncate font-medium text-foreground ${privateBlurClassName}`}>
				{formatTaskTimestamp(value)}
			</div>
		</button>
	);
}

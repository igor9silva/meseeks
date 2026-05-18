import { Mdx } from '~/components/ui/mdx';
import { getPrivateBlurClassName } from './taskDetailUtils';

export function TaskDetailBody({
	body,
	warnings,
	assetBasePath,
	shouldBlur,
}: {
	body: string;
	warnings: string[];
	assetBasePath: string | null;
	shouldBlur: boolean;
}) {
	//
	const privateBlurClassName = getPrivateBlurClassName(shouldBlur);

	return (
		<div className="space-y-4 p-4">
			<div className={privateBlurClassName}>
				<Mdx text={body} className="text-sm" assetBasePath={assetBasePath} />
			</div>

			{warnings.length > 0 && (
				<details
					className={`rounded-md border border-border/60 bg-muted/20 p-2 text-xs text-muted-foreground ${privateBlurClassName}`}
				>
					<summary className="cursor-pointer font-medium">Warnings ({warnings.length})</summary>
					<ul className="mt-2 list-disc space-y-1 pl-5">
						{warnings.map((warning) => (
							<li key={warning}>{warning}</li>
						))}
					</ul>
				</details>
			)}
		</div>
	);
}

import { Badge } from '@pro/ui/badge';
import type { SkillInputArgument } from 'schemas/skillSchema';

export function SkillInputSummary({ input }: { input?: SkillInputArgument[] }) {
	//
	const args = input ?? [];
	if (args.length === 0) return <span className="text-muted-foreground">No input arguments</span>;

	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5">
			<span className="mr-1 text-muted-foreground">
				{args.length} input argument{args.length === 1 ? '' : 's'}
			</span>
			{args.map((arg) => (
				<Badge key={arg.key} variant={arg.required ? 'default' : 'outline'} className="font-mono text-xs">
					{arg.key}
				</Badge>
			))}
		</div>
	);
}

export function SkillInputArguments({ input }: { input?: SkillInputArgument[] }) {
	//
	const args = input ?? [];
	if (args.length === 0) return <p className="text-sm text-muted-foreground">No input arguments.</p>;

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b">
						<th className="p-2 text-left font-medium">Argument</th>
						<th className="p-2 text-left font-medium">Type</th>
						<th className="p-2 text-left font-medium">Required</th>
						<th className="p-2 text-left font-medium">Description</th>
					</tr>
				</thead>
				<tbody>
					{args.map((arg) => (
						<tr key={arg.key} className="border-b last:border-b-0">
							<td className="p-2 align-top">
								<code className="rounded bg-muted px-1 py-0.5 text-xs">{arg.key}</code>
							</td>
							<td className="p-2 align-top">
								<Badge variant="outline" className="font-mono text-xs">
									{arg.type}
								</Badge>
							</td>
							<td className="p-2 align-top">
								<Badge variant={arg.required ? 'destructive' : 'secondary'} className="text-xs">
									{arg.required ? 'yes' : 'no'}
								</Badge>
							</td>
							<td className="p-2 align-top text-muted-foreground">{arg.description || '-'}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

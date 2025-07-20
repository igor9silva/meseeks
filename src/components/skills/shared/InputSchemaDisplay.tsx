import { Badge } from '~/components/ui/badge';
import { parseJsonSchemaToProperties } from '~/lib/json-schema-parser';

export function InputSchemaDisplay({ schema }: { schema: string }) {
	//
	const properties = parseJsonSchemaToProperties(schema);

	if (properties.length === 0) {
		return <p className="text-sm text-muted-foreground">None.</p>;
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-b">
						<th className="text-left p-2 font-medium text-sm">Property</th>
						<th className="text-left p-2 font-medium text-sm">Type</th>
						<th className="text-left p-2 font-medium text-sm">Required</th>
						<th className="text-left p-2 font-medium text-sm">Description</th>
					</tr>
				</thead>
				<tbody>
					{properties.map((prop) => (
						<tr key={prop.name} className="border-b last:border-b-0">
							<td className="p-2">
								<code className="text-sm bg-muted px-1 py-0.5 rounded">{prop.name}</code>
							</td>
							<td className="p-2">
								<Badge variant="outline" className="text-xs">
									{prop.type}
								</Badge>
							</td>
							<td className="p-2">
								<Badge variant={prop.required ? 'destructive' : 'secondary'} className="text-xs">
									{prop.required ? 'yes' : 'no'}
								</Badge>
							</td>
							<td className="p-2 text-sm">
								<div>
									{prop.description}
									{prop.constraints && (
										<div className="text-xs text-muted-foreground mt-1 space-y-0.5">
											{prop.constraints.map((constraint, i) => (
												<div key={i}>{constraint}</div>
											))}
										</div>
									)}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

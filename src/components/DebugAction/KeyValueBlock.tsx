export function KeyValueBlock({ entries }: { entries: Array<[string, unknown]> }) {
	//
	return (
		<div className="bg-muted border rounded-lg p-3 text-sm space-y-1 max-h-48 overflow-auto resize-y">
			{entries.map(([key, value]) => (
				<div key={key} className="flex gap-2">
					<span className="text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">{key}:</span>
					<span className="whitespace-pre-wrap break-words">
						{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
					</span>
				</div>
			))}
		</div>
	);
}

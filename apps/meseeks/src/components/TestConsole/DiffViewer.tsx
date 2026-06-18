import type { RevisionContent } from './revisions';

type DiffLine = {
	kind: 'same' | 'added' | 'removed';
	oldLine?: number;
	newLine?: number;
	text: string;
};

export function DiffViewer({ content }: { content: RevisionContent }) {
	//
	const before = content.before ?? '';
	const after = content.after ?? '';
	const hasText = content.before !== undefined || content.after !== undefined;

	if (!hasText) {
		return <p className="text-xs text-muted-foreground">No text body in this patch.</p>;
	}

	const diff = buildLineDiff(before, after);
	const additions = diff.filter((line) => line.kind === 'added').length;
	const removals = diff.filter((line) => line.kind === 'removed').length;

	return (
		<div className="overflow-hidden rounded-md border">
			<div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2 text-xs">
				<div className="truncate text-muted-foreground">
					{content.beforeContentType ?? 'none'} -&gt; {content.afterContentType ?? 'none'}
				</div>
				<div className="flex shrink-0 gap-3 font-mono">
					<span className="text-emerald-600">+{additions}</span>
					<span className="text-destructive">-{removals}</span>
				</div>
			</div>
			<div className="overflow-x-auto font-mono text-xs" data-testid="test-console-diff-viewer">
				{diff.length === 0 ? (
					<div className="p-3 text-muted-foreground">No text changes.</div>
				) : (
					diff.map((line, index) => <DiffRow key={`${index}:${line.kind}`} line={line} />)
				)}
			</div>
		</div>
	);
}

function DiffRow({ line }: { line: DiffLine }) {
	//
	return (
		<div className={`grid grid-cols-[3rem_3rem_1.5rem_minmax(0,1fr)] ${rowClass(line.kind)}`}>
			<div className="select-none border-r px-2 py-0.5 text-right text-muted-foreground">
				{line.oldLine ?? ''}
			</div>
			<div className="select-none border-r px-2 py-0.5 text-right text-muted-foreground">
				{line.newLine ?? ''}
			</div>
			<div className="select-none px-2 py-0.5 text-center">{marker(line.kind)}</div>
			<pre className="overflow-x-auto px-2 py-0.5 whitespace-pre">{line.text || ' '}</pre>
		</div>
	);
}

function buildLineDiff(before: string, after: string) {
	//
	const beforeLines = splitLines(before);
	const afterLines = splitLines(after);
	const table = buildLcsTable(beforeLines, afterLines);
	const lines: Array<DiffLine> = [];
	let beforeIndex = 0;
	let afterIndex = 0;
	let oldLine = 1;
	let newLine = 1;

	while (beforeIndex < beforeLines.length && afterIndex < afterLines.length) {
		if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
			lines.push({
				kind: 'same',
				oldLine,
				newLine,
				text: beforeLines[beforeIndex] ?? '',
			});
			beforeIndex += 1;
			afterIndex += 1;
			oldLine += 1;
			newLine += 1;
			continue;
		}

		if (table[beforeIndex + 1]?.[afterIndex] >= table[beforeIndex]?.[afterIndex + 1]) {
			lines.push({
				kind: 'removed',
				oldLine,
				text: beforeLines[beforeIndex] ?? '',
			});
			beforeIndex += 1;
			oldLine += 1;
			continue;
		}

		lines.push({
			kind: 'added',
			newLine,
			text: afterLines[afterIndex] ?? '',
		});
		afterIndex += 1;
		newLine += 1;
	}

	while (beforeIndex < beforeLines.length) {
		lines.push({
			kind: 'removed',
			oldLine,
			text: beforeLines[beforeIndex] ?? '',
		});
		beforeIndex += 1;
		oldLine += 1;
	}

	while (afterIndex < afterLines.length) {
		lines.push({
			kind: 'added',
			newLine,
			text: afterLines[afterIndex] ?? '',
		});
		afterIndex += 1;
		newLine += 1;
	}

	return lines;
}

function buildLcsTable(beforeLines: Array<string>, afterLines: Array<string>) {
	//
	const table: Array<Array<number>> = Array.from({ length: beforeLines.length + 1 }, () =>
		Array.from({ length: afterLines.length + 1 }, () => 0),
	);

	for (let beforeIndex = beforeLines.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
		for (let afterIndex = afterLines.length - 1; afterIndex >= 0; afterIndex -= 1) {
			if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
				table[beforeIndex][afterIndex] = (table[beforeIndex + 1]?.[afterIndex + 1] ?? 0) + 1;
				continue;
			}

			table[beforeIndex][afterIndex] = Math.max(
				table[beforeIndex + 1]?.[afterIndex] ?? 0,
				table[beforeIndex]?.[afterIndex + 1] ?? 0,
			);
		}
	}

	return table;
}

function splitLines(content: string) {
	//
	if (!content) return [];

	const lines = content.split('\n');
	if (lines[lines.length - 1] === '') return lines.slice(0, -1);

	return lines;
}

function rowClass(kind: DiffLine['kind']) {
	//
	if (kind === 'added') return 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
	if (kind === 'removed') return 'bg-destructive/10 text-destructive';

	return 'bg-background';
}

function marker(kind: DiffLine['kind']) {
	//
	if (kind === 'added') return '+';
	if (kind === 'removed') return '-';

	return '';
}

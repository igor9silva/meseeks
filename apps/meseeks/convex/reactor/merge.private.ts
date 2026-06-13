const changedRange = (base: string[], next: string[]) => {
	let start = 0;
	while (start < base.length && start < next.length && base[start] === next[start]) {
		start += 1;
	}

	let suffix = 0;
	while (
		suffix < base.length - start &&
		suffix < next.length - start &&
		base[base.length - 1 - suffix] === next[next.length - 1 - suffix]
	) {
		suffix += 1;
	}

	return {
		start,
		end: base.length - suffix,
		replacement: next.slice(start, next.length - suffix),
	};
};

const replaceRange = (lines: string[], range: ReturnType<typeof changedRange>) =>
	lines.slice(0, range.start).concat(range.replacement, lines.slice(range.end));

export const tryThreeWayMerge = ({ base, current, proposed }: { base: string; current: string; proposed: string }) => {
	if (current === base) return { content: proposed };
	if (proposed === base || proposed === current) return { content: current };

	const baseLines = base.split('\n');
	const currentLines = current.split('\n');
	const proposedLines = proposed.split('\n');
	const currentChange = changedRange(baseLines, currentLines);
	const proposedChange = changedRange(baseLines, proposedLines);

	const hasSameInsertionPoint =
		currentChange.start === currentChange.end &&
		proposedChange.start === proposedChange.end &&
		currentChange.start === proposedChange.start;
	const hasOverlap = currentChange.start < proposedChange.end && proposedChange.start < currentChange.end;
	if (hasOverlap || hasSameInsertionPoint) return { conflict: true };

	const ranges = [currentChange, proposedChange].sort((left, right) => right.start - left.start);
	const merged = ranges.reduce((lines, range) => replaceRange(lines, range), baseLines);
	return { content: merged.join('\n') };
};

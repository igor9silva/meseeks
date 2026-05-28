import { Children, isValidElement, type ReactNode } from 'react';

interface ElementWithChildrenProps {
	children?: ReactNode;
	className?: string;
}

export function readMermaidSource(children: ReactNode): string | null {
	//
	const childrenList = Children.toArray(children);
	for (const child of childrenList) {
		const source = findMermaidSource(child);
		if (source) return source;
	}

	if (childrenList.length === 0) return null;

	const blockSource = readNodeText(children).trim();
	if (!looksLikeMermaidSource(blockSource)) return null;
	return blockSource;
}

function readNodeText(node: ReactNode): string {
	//
	if (typeof node === 'string') return node;
	if (typeof node === 'number') return String(node);
	if (isValidElement<ElementWithChildrenProps>(node)) {
		return readNodeText(node.props.children);
	}
	if (!Array.isArray(node)) return '';

	return node.map((entry) => readNodeText(entry)).join('');
}

function findMermaidSource(node: ReactNode): string | null {
	//
	if (node === null || node === undefined || typeof node === 'boolean') {
		return null;
	}

	if (Array.isArray(node)) {
		for (const entry of node) {
			const source = findMermaidSource(entry);
			if (source) return source;
		}
		return null;
	}

	if (!isValidElement<ElementWithChildrenProps>(node)) return null;

	const className = typeof node.props.className === 'string' ? node.props.className : '';
	const source = readNodeText(node.props.children).trim();

	if (source.length > 0) {
		if (hasMermaidClassName(className)) return source;
		if (looksLikeMermaidSource(source)) return source;
	}

	return findMermaidSource(node.props.children);
}

function hasMermaidClassName(className: string): boolean {
	//
	const classTokens = className.split(/\s+/).filter((token) => token.length > 0);
	return classTokens.includes('language-mermaid');
}

function looksLikeMermaidSource(source: string): boolean {
	//
	const firstLine = source
		.split('\n')
		.map((line) => line.trim())
		.find((line) => line.length > 0);

	if (!firstLine) return false;

	const knownStarts = [
		'flowchart ',
		'graph ',
		'sequenceDiagram',
		'classDiagram',
		'stateDiagram',
		'erDiagram',
		'journey',
		'gantt',
		'pie ',
		'mindmap',
		'timeline',
		'gitGraph',
	];

	return knownStarts.some((entry) => firstLine.startsWith(entry));
}

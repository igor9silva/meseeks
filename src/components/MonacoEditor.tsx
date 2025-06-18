import { DiffEditor, Editor } from '@monaco-editor/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '~/lib/utils';

type MonacoEditableContentProps = {
	value: string;
	onSave: (value: string) => void;
	language?: string;
	viewClassName?: string;
	editClassName?: string;
	asView?: (props: {
		value: string;
		className?: string;
		enterEditMode: (e: React.MouseEvent | React.TouchEvent) => void;
		isEmpty: boolean;
	}) => React.ReactNode;
	as?: keyof JSX.IntrinsicElements;
	options?: any;
	showDiff?: boolean;
	originalValue?: string;
};

export function MonacoEditableContent({
	value,
	onSave,
	language = 'markdown',
	viewClassName,
	editClassName,
	asView,
	as: Component = 'div',
	options = {},
	showDiff = false,
	originalValue,
}: MonacoEditableContentProps) {
	//
	const [isEditing, setIsEditing] = useState(false);
	const [editedValue, setEditedValue] = useState(value);
	const [isEditorReady, setIsEditorReady] = useState(false);
	const [editorHeight, setEditorHeight] = useState(400);
	const editorRef = useRef<any>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const mountedRef = useRef(true);

	// detect theme from document
	const [theme, setTheme] = useState<'light' | 'dark'>('light');

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		//
		const detectTheme = () => {
			if (!mountedRef.current) return;
			const isDark = document.documentElement.classList.contains('dark');
			setTheme(isDark ? 'dark' : 'light');
		};

		// initial detection
		detectTheme();

		// watch for theme changes
		const observer = new MutationObserver(detectTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});

		return () => observer.disconnect();
	}, []);

	// update editedValue when value prop changes
	useEffect(() => {
		if (!isEditing && mountedRef.current) {
			setEditedValue(value);
		}
	}, [value, isEditing]);

	// calculate initial height based on content
	useEffect(() => {
		if (isEditing && editedValue) {
			const lines = editedValue.split('\n').length;
			const calculatedHeight = Math.max(300, Math.min(800, lines * 20 + 100));
			setEditorHeight(calculatedHeight);
		}
	}, [isEditing, editedValue]);

	const enterEditMode = useCallback(
		(e: React.MouseEvent | React.TouchEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsEditing(true);
			setEditedValue(value);
			setIsEditorReady(false);
		},
		[value],
	);

	const saveChanges = useCallback(() => {
		if (!mountedRef.current) return;
		setIsEditing(false);

		// only save if the value has changed
		if (editedValue !== value) {
			onSave(editedValue);
		}
	}, [editedValue, value, onSave]);

	const cancelChanges = useCallback(() => {
		if (!mountedRef.current) return;
		setIsEditing(false);
		setEditedValue(value);
	}, [value]);

	const handleEditorDidMount = useCallback(
		(editor: any) => {
			if (!mountedRef.current) return;

			editorRef.current = editor;
			setIsEditorReady(true);

			// focus the editor
			setTimeout(() => {
				if (mountedRef.current && editor) {
					editor.focus();
				}
			}, 100);

			// add custom keybindings
			try {
				editor.addCommand(editor.KeyMod.CtrlCmd | editor.KeyCode.Enter, () => {
					if (mountedRef.current) {
						saveChanges();
					}
				});

				editor.addCommand(editor.KeyCode.Escape, () => {
					if (mountedRef.current) {
						cancelChanges();
					}
				});

				// dynamic height adjustment based on content
				const updateHeight = () => {
					if (!mountedRef.current || !editor) return;
					try {
						const contentHeight = editor.getContentHeight();
						const newHeight = Math.max(300, Math.min(800, contentHeight + 40));
						setEditorHeight(newHeight);

						// also layout the editor
						if (containerRef.current) {
							editor.layout({
								width: containerRef.current.clientWidth,
								height: newHeight,
							});
						}
					} catch (error) {
						console.debug('Monaco editor height update failed:', error);
					}
				};

				// listen for content changes to adjust height
				editor.onDidContentSizeChange(updateHeight);

				// initial height update
				setTimeout(updateHeight, 200);

				// layout on resize
				const resizeObserver = new ResizeObserver(() => {
					if (!mountedRef.current || !editor || !containerRef.current) return;
					try {
						editor.layout({
							width: containerRef.current.clientWidth,
							height: editorHeight,
						});
					} catch (error) {
						console.debug('Monaco editor layout failed:', error);
					}
				});

				if (containerRef.current) {
					resizeObserver.observe(containerRef.current);
				}

				// cleanup
				return () => {
					resizeObserver.disconnect();
				};
			} catch (error) {
				console.debug('Monaco editor setup failed:', error);
			}
		},
		[saveChanges, cancelChanges, editorHeight],
	);

	const handleEditorChange = useCallback((newValue: string | undefined) => {
		if (mountedRef.current) {
			setEditedValue(newValue || '');
		}
	}, []);

	const isEmpty = !editedValue || !editedValue.trim();

	const defaultOptions = {
		minimap: { enabled: false },
		scrollBeyondLastLine: false,
		wordWrap: 'on' as const,
		lineNumbers: 'off' as const,
		folding: false,
		lineDecorationsWidth: 0,
		lineNumbersMinChars: 0,
		overviewRulerBorder: false,
		scrollbar: {
			vertical: 'auto' as const,
			horizontal: 'auto' as const,
			verticalScrollbarSize: 8,
			horizontalScrollbarSize: 8,
		},
		hideCursorInOverviewRuler: true,
		overviewRulerLanes: 0,
		fontSize: 14,
		fontFamily:
			'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		padding: { top: 16, bottom: 16 },
		suggest: {
			snippetsPreventQuickSuggestions: false,
		},
		quickSuggestions: {
			other: true,
			comments: true,
			strings: true,
		},
		automaticLayout: true,
		// Force background color visibility
		theme: theme === 'dark' ? 'vs-dark' : 'vs',
		...options,
	};

	if (isEditing) {
		const shouldUseDiffEditor = showDiff && originalValue && originalValue !== editedValue;

		return (
			<div className={cn('relative border rounded-lg overflow-hidden bg-background w-full', editClassName)}>
				<div ref={containerRef} className="w-full bg-background" style={{ height: `${editorHeight}px` }}>
					{shouldUseDiffEditor ? (
						<DiffEditor
							original={originalValue}
							modified={editedValue}
							language={language}
							theme={theme === 'dark' ? 'vs-dark' : 'vs'}
							onMount={handleEditorDidMount}
							options={{
								...defaultOptions,
								renderSideBySide: false,
								readOnly: false,
							}}
							loading={<div className="p-4 text-center bg-background">Loading editor...</div>}
						/>
					) : (
						<Editor
							value={editedValue}
							language={language}
							theme={theme === 'dark' ? 'vs-dark' : 'vs'}
							onChange={handleEditorChange}
							onMount={handleEditorDidMount}
							options={defaultOptions}
							loading={<div className="p-4 text-center bg-background">Loading editor...</div>}
						/>
					)}
				</div>
				<div className="absolute top-2 right-2 flex gap-2 z-20 bg-background border rounded-md shadow-lg p-2">
					<button
						onClick={saveChanges}
						className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
						disabled={!isEditorReady}
					>
						Save (⌘+Enter)
					</button>
					<button
						onClick={cancelChanges}
						className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
					>
						Cancel (Esc)
					</button>
				</div>
			</div>
		);
	}

	return (
		<Component
			className={cn('cursor-pointer hover:bg-muted/20 transition-colors rounded p-1', viewClassName)}
			onMouseUp={(e) => {
				// middle click
				if (e.button === 1) enterEditMode(e);
			}}
			onTouchStart={(e) => {
				// three finger tap
				if (e.touches.length === 3) enterEditMode(e);
			}}
			onClick={(e) => {
				// double click to enter edit mode
				if (e.detail === 2) enterEditMode(e);
			}}
		>
			{asView ? asView({ value, enterEditMode, className: viewClassName, isEmpty }) : editedValue}
		</Component>
	);
}

// separate component for showing diffs
export function MonacoDiffViewer({
	original,
	modified,
	language = 'markdown',
	className,
}: {
	original: string;
	modified: string;
	language?: string;
	className?: string;
}) {
	//
	const [theme, setTheme] = useState<'light' | 'dark'>('light');
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		//
		const detectTheme = () => {
			if (!mountedRef.current) return;
			const isDark = document.documentElement.classList.contains('dark');
			setTheme(isDark ? 'dark' : 'light');
		};

		detectTheme();

		const observer = new MutationObserver(detectTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});

		return () => observer.disconnect();
	}, []);

	const options = {
		readOnly: true,
		minimap: { enabled: false },
		scrollBeyondLastLine: false,
		wordWrap: 'on' as const,
		lineNumbers: 'on' as const,
		renderSideBySide: true,
		fontSize: 14,
		fontFamily:
			'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		automaticLayout: true,
	};

	return (
		<div className={cn('border rounded-lg overflow-hidden bg-background w-full', className)}>
			<DiffEditor
				original={original}
				modified={modified}
				language={language}
				theme={theme === 'dark' ? 'vs-dark' : 'vs'}
				options={options}
				height="400px"
				loading={<div className="p-4 text-center bg-background">Loading diff viewer...</div>}
			/>
		</div>
	);
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { MonacoDiffViewer, MonacoEditableContent } from './MonacoEditor';
import { MonacoErrorBoundary } from './MonacoErrorBoundary';

export function MonacoDemo() {
	//
	const [markdownText, setMarkdownText] = useState(`# Monaco Editor Demo

This is a **demo** of Monaco Editor integration with our app.

## Features

- Syntax highlighting for markdown
- Auto-completion
- Keyboard shortcuts (Cmd+Enter to save, Esc to cancel)
- Theme detection (follows app theme)
- Diff viewing capabilities

### Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Todo List

- [x] Implement Monaco Editor
- [x] Add theme detection
- [x] Add diff viewer
- [ ] Test with real task data
- [ ] Performance optimization

> This is a blockquote to test markdown rendering.

---

**Bold text** and *italic text* work as expected.`);

	const [jsxCode, setJsxCode] = useState(`import { useState } from 'react';

export function ExampleComponent() {
  //
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Counter: {count}</h1>
      <button 
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Increment
      </button>
    </div>
  );
}`);

	const originalMarkdown = `# Original Task Description

This is the original task description that was created initially.

## Requirements

- Basic functionality
- Simple UI

The user wants to implement a basic counter.`;

	const modifiedMarkdown = `# Updated Task Description

This is the updated task description with more details and requirements.

## Requirements

- Advanced functionality with state management
- Beautiful, responsive UI with Tailwind CSS
- Accessibility features
- Unit tests
- TypeScript implementation

## Additional Notes

The user wants to implement a counter with the following features:
- Increment/decrement buttons
- Reset functionality
- Keyboard shortcuts
- Persistent state

## Acceptance Criteria

- [ ] Counter displays current value
- [ ] Buttons work correctly
- [ ] State persists across page reloads
- [ ] Keyboard shortcuts (Space to increment, R to reset)
- [ ] Responsive design`;

	return (
		<div className="max-w-6xl mx-auto p-6 space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Monaco Editor Integration Demo</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground mb-4">
						This demo showcases Monaco Editor integration with different languages and features. Try editing
						the content below using the Monaco Editor.
					</p>

					<Tabs defaultValue="markdown" className="w-full">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="markdown">Markdown Editor</TabsTrigger>
							<TabsTrigger value="jsx">JSX Editor</TabsTrigger>
							<TabsTrigger value="diff">Diff Viewer</TabsTrigger>
						</TabsList>

						<TabsContent value="markdown" className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold mb-2">Markdown Editor</h3>
								<p className="text-sm text-muted-foreground mb-4">
									Click on the content below to edit with Monaco Editor. Supports syntax highlighting,
									auto-completion, and keyboard shortcuts.
								</p>
								<MonacoErrorBoundary>
									<MonacoEditableContent
										value={markdownText}
										onSave={setMarkdownText}
										language="markdown"
										viewClassName="min-h-[300px] p-4 border rounded-lg bg-muted/20"
										editClassName="min-h-[400px]"
									/>
								</MonacoErrorBoundary>
							</div>
						</TabsContent>

						<TabsContent value="jsx" className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold mb-2">JSX/TypeScript Editor</h3>
								<p className="text-sm text-muted-foreground mb-4">
									Example of Monaco Editor with JSX/TypeScript support. Features IntelliSense and
									syntax validation.
								</p>
								<MonacoErrorBoundary>
									<MonacoEditableContent
										value={jsxCode}
										onSave={setJsxCode}
										language="typescript"
										viewClassName="min-h-[300px] p-4 border rounded-lg bg-muted/20 font-mono text-sm"
										editClassName="min-h-[400px]"
										options={{
											lineNumbers: 'on',
											minimap: { enabled: true },
										}}
									/>
								</MonacoErrorBoundary>
							</div>
						</TabsContent>

						<TabsContent value="diff" className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold mb-2">Diff Viewer</h3>
								<p className="text-sm text-muted-foreground mb-4">
									This shows how task descriptions might look when comparing versions. Useful for
									showing changes over time.
								</p>
								<MonacoErrorBoundary>
									<MonacoDiffViewer
										original={originalMarkdown}
										modified={modifiedMarkdown}
										language="markdown"
										className="min-h-[400px]"
									/>
								</MonacoErrorBoundary>
							</div>
						</TabsContent>
					</Tabs>

					<div className="mt-6 p-4 bg-muted/50 rounded-lg">
						<h4 className="font-semibold mb-2">How to Use:</h4>
						<ul className="text-sm space-y-1 text-muted-foreground">
							<li>• Click content to edit (or double-click for quick access)</li>
							<li>• Use Cmd+Enter (Ctrl+Enter on Windows) to save changes</li>
							<li>• Press Escape to cancel editing</li>
							<li>• Middle mouse button click for quick edit mode</li>
							<li>• Three-finger tap on mobile devices</li>
						</ul>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

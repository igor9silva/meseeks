import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class MonacoErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.debug('Monaco Editor Error:', error, errorInfo);
	}

	private handleRetry = () => {
		this.setState({ hasError: false, error: undefined });
	};

	public render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<Card className="w-full">
					<CardHeader>
						<CardTitle className="text-destructive">Monaco Editor Error</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-muted-foreground">
							The Monaco editor failed to load. This might be due to a network issue or browser
							compatibility.
						</p>
						{this.state.error && (
							<details className="text-xs">
								<summary className="cursor-pointer">Error details</summary>
								<pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
									{this.state.error.message}
								</pre>
							</details>
						)}
						<div className="flex gap-2">
							<Button onClick={this.handleRetry} size="sm">
								Try Again
							</Button>
							<Button variant="outline" size="sm" onClick={() => window.location.reload()}>
								Reload Page
							</Button>
						</div>
					</CardContent>
				</Card>
			);
		}

		return this.props.children;
	}
}

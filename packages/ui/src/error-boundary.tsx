import { Component, type ErrorInfo, type ReactNode } from 'react';

export type ErrorBoundaryFallbackProps = {
	error: unknown;
	resetErrorBoundary: () => void;
};

type ErrorBoundaryProps = {
	fallbackRender: (props: ErrorBoundaryFallbackProps) => ReactNode;
	children: ReactNode;
	onError?: (error: unknown, info: ErrorInfo) => void;
};

type ErrorBoundaryState =
	| {
			didCatch: false;
			error: null;
	  }
	| {
			didCatch: true;
			error: unknown;
	  };

const cleanState: ErrorBoundaryState = {
	didCatch: false,
	error: null,
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	//
	state: ErrorBoundaryState = cleanState;

	static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
		return {
			didCatch: true,
			error,
		};
	}

	resetErrorBoundary = () => {
		this.setState(cleanState);
	};

	componentDidCatch(error: unknown, info: ErrorInfo) {
		this.props.onError?.(error, info);
	}

	render() {
		if (this.state.didCatch) {
			return this.props.fallbackRender({
				error: this.state.error,
				resetErrorBoundary: this.resetErrorBoundary,
			});
		}

		return this.props.children;
	}
}

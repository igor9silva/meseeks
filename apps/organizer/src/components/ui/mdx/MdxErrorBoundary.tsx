import { Component, type ReactNode } from 'react';

interface MdxErrorBoundaryState {
	hasError: boolean;
	children: ReactNode;
}

export class MdxErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, MdxErrorBoundaryState> {
	state: MdxErrorBoundaryState = { hasError: false, children: this.props.children };

	static getDerivedStateFromError(): Pick<MdxErrorBoundaryState, 'hasError'> {
		//
		return { hasError: true };
	}

	static getDerivedStateFromProps(
		props: Readonly<{ children: ReactNode }>,
		state: MdxErrorBoundaryState,
	): MdxErrorBoundaryState | null {
		if (props.children === state.children) return null;
		return { hasError: false, children: props.children };
	}

	render() {
		//
		if (this.state.hasError) return this.props.fallback;
		return this.props.children;
	}
}

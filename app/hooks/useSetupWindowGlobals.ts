import React from 'react';

// declare global window interface for runtime globals
declare global {
	interface Window {
		React: typeof React;
		useRef: typeof React.useRef;
		useState: typeof React.useState;
		useEffect: typeof React.useEffect;
	}
}

export function useSetupWindowGlobals() {
	//
	const hasSetup = React.useRef(false);

	React.useEffect(() => {
		//
		if (hasSetup.current) return;

		window.React = React;
		window.useRef = React.useRef;
		window.useState = React.useState;
		window.useEffect = React.useEffect;

		hasSetup.current = true;
	}, []);
}

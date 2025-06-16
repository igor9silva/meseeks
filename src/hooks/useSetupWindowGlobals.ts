import { asDollars } from 'convex/lib/money';
import React from 'react';
import { useCurrentTask } from '~/hooks/useCurrentTask';
import { useTask } from '~/hooks/useTask';

// declare global window interface for runtime globals
declare global {
	interface Window {
		//
		React: typeof React;
		useRef: typeof React.useRef;
		useState: typeof React.useState;
		useEffect: typeof React.useEffect;

		useTask: typeof useTask;
		useCurrentTask: typeof useCurrentTask;

		asDollars: typeof asDollars;
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

		window.useTask = useTask;
		window.useCurrentTask = useCurrentTask;

		window.asDollars = asDollars;

		hasSetup.current = true;
	}, []);
}

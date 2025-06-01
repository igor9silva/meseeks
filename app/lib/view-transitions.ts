// Track if we're currently in a view transition to help identify related errors
let isInViewTransition = false;
let isInitialized = false;

// Type guard to check if an error is a view transition abort error
function isViewTransitionAbortError(reason: unknown): reason is DOMException {
	//
	// View transition aborts are DOMException objects with name "AbortError"
	// We're conservative and only handle AbortErrors when we know we're in a view transition
	if (!(reason instanceof DOMException) || reason.name !== 'AbortError') {
		return false;
	}

	// Only consider it a view transition error if:
	// 1. Browser supports view transitions
	// 2. We're currently tracking that we're in a view transition
	return typeof document.startViewTransition === 'function' && isInViewTransition;
}

// Event handler for unhandled rejections
function handleUnhandledRejection(event: PromiseRejectionEvent) {
	//
	// Check if the error is related to view transitions being aborted
	const isViewTransitionError = isViewTransitionAbortError(event.reason);

	if (isViewTransitionError) {
		// Prevent the error from being logged as an error
		event.preventDefault();

		// Log as debug instead (normal behavior when navigating quickly)
		console.debug('View transition aborted (normal when navigating quickly)');
	}
}

// Utility to handle aborted view transition errors gracefully
export function suppressViewTransitionErrors() {
	//
	// Prevent multiple initializations
	if (isInitialized) return;

	// Only set up if browser supports view transitions
	if (typeof document.startViewTransition !== 'function') return;

	isInitialized = true;

	// Track view transition state to help identify related errors
	const originalStartViewTransition = document.startViewTransition;

	document.startViewTransition = function (callback) {
		//
		isInViewTransition = true;

		const transition = originalStartViewTransition.call(this, callback);

		// Reset flag when transition finishes (success or failure)
		transition.finished.finally(() => {
			isInViewTransition = false;
		});

		return transition;
	};

	// Listen for unhandled promise rejections related to view transitions
	window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

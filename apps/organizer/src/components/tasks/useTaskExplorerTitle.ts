import { useEffect } from 'react';

export function useTaskExplorerTitle({
	currentTitle,
	detailTitle,
	isCreatingTask,
}: {
	currentTitle: string | null | undefined;
	detailTitle: string | null | undefined;
	isCreatingTask: boolean;
}) {
	//
	useEffect(() => {
		const appTitle = 'Organizer';

		if (isCreatingTask) {
			document.title = 'New task';
			return;
		}

		if (detailTitle) {
			document.title = detailTitle;
			return;
		}

		if (currentTitle) {
			document.title = currentTitle;
			return;
		}

		document.title = appTitle;
	}, [currentTitle, detailTitle, isCreatingTask]);
}

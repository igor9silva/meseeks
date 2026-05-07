import { usePreferenceValue } from './usePreferenceValue';
import { useSetPreference } from './useSetPreference';

export function useTaskListVisiblePreference({ defaultValue = true }: { defaultValue?: boolean } = {}) {
	//
	const preference = usePreferenceValue('taskListVisible');
	const setPreference = useSetPreference();

	const isTaskListVisible = typeof preference === 'boolean' ? preference : defaultValue;

	const setIsTaskListVisible = (isVisible: boolean) => {
		setPreference({ key: 'taskListVisible', value: isVisible });
	};

	return { isTaskListVisible, setIsTaskListVisible };
}

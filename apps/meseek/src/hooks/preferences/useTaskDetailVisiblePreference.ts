import { usePreferenceValue } from './usePreferenceValue';
import { useSetPreference } from './useSetPreference';

export function useTaskDetailVisiblePreference({ defaultValue = true }: { defaultValue?: boolean } = {}) {
	//
	const preference = usePreferenceValue('taskDetailVisible');
	const setPreference = useSetPreference();

	const isTaskDetailVisible = typeof preference === 'boolean' ? preference : defaultValue;

	const setIsTaskDetailVisible = (isVisible: boolean) => {
		setPreference({ key: 'taskDetailVisible', value: isVisible });
	};

	return { isTaskDetailVisible, setIsTaskDetailVisible };
}

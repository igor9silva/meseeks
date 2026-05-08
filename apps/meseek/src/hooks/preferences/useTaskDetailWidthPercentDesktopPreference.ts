import { usePreferenceValue } from './usePreferenceValue';
import { useSetPreference } from './useSetPreference';

export function useTaskDetailWidthPercentDesktopPreference({ defaultValue = 50 }: { defaultValue?: number } = {}) {
	//
	const preference = usePreferenceValue('taskDetailWidthPercentDesktop');
	const setPreference = useSetPreference();

	const getTaskDetailWidthPercentDesktop = () => (typeof preference === 'number' ? preference : defaultValue);

	const setTaskDetailWidthPercentDesktop = (widthPercent: number) => {
		setPreference({ key: 'taskDetailWidthPercentDesktop', value: widthPercent });
	};

	return { getTaskDetailWidthPercentDesktop, setTaskDetailWidthPercentDesktop };
}

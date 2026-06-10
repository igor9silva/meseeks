import { usePreferenceValue } from './usePreferenceValue';
import { useSetPreference } from './useSetPreference';

export function useFileDetailWidthPercentDesktopPreference({ defaultValue = 50 }: { defaultValue?: number } = {}) {
	//
	const preference = usePreferenceValue('fileDetailWidthPercentDesktop');
	const setPreference = useSetPreference();

	const getFileDetailWidthPercentDesktop = () => (typeof preference === 'number' ? preference : defaultValue);

	const setFileDetailWidthPercentDesktop = (widthPercent: number) => {
		setPreference({ key: 'fileDetailWidthPercentDesktop', value: widthPercent });
	};

	return { getFileDetailWidthPercentDesktop, setFileDetailWidthPercentDesktop };
}

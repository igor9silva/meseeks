import { usePreferenceValue } from './usePreferenceValue';
import { useSetPreference } from './useSetPreference';

export function useFileDetailVisiblePreference({ defaultValue = true }: { defaultValue?: boolean } = {}) {
	//
	const preference = usePreferenceValue('fileDetailVisible');
	const setPreference = useSetPreference();

	const isFileDetailVisible = typeof preference === 'boolean' ? preference : defaultValue;

	const setIsFileDetailVisible = (isVisible: boolean) => {
		setPreference({ key: 'fileDetailVisible', value: isVisible });
	};

	return { isFileDetailVisible, setIsFileDetailVisible };
}

import { usePreferenceValue } from './usePreferenceValue';
import { useSetPreference } from './useSetPreference';

export function useFileListVisiblePreference({ defaultValue = true }: { defaultValue?: boolean } = {}) {
	//
	const preference = usePreferenceValue('fileListVisible');
	const setPreference = useSetPreference();

	const isFileListVisible = typeof preference === 'boolean' ? preference : defaultValue;

	const setIsFileListVisible = (isVisible: boolean) => {
		setPreference({ key: 'fileListVisible', value: isVisible });
	};

	return { isFileListVisible, setIsFileListVisible };
}

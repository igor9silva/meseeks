import { usePreferenceValue } from './usePreferenceValue';
import { useSetPreference } from './useSetPreference';

export function useInboxWidthPercentPreference({ defaultValue = 50 }: { defaultValue?: number } = {}) {
	//
	const preference = usePreferenceValue('inboxWidthPercent');
	const setPreference = useSetPreference();

	const getInboxWidthPercent = () => (typeof preference === 'number' ? preference : defaultValue);

	const setInboxWidthPercent = (widthPercent: number) => {
		setPreference({ key: 'inboxWidthPercent', value: widthPercent });
	};

	return { getInboxWidthPercent, setInboxWidthPercent };
}

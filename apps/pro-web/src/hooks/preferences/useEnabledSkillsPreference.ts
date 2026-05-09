import { isString } from 'lib/guards';
import { usePreferenceValue } from './usePreferenceValue';
import { useSetPreference } from './useSetPreference';

export function useEnabledSkillsPreference({ defaultValue = [] }: { defaultValue?: unknown[] } = {}) {
	//
	const preference = usePreferenceValue('enabledSkills');
	const setPreference = useSetPreference();

	const rawEnabledSkills = Array.isArray(preference) ? preference : defaultValue;
	const enabledSkills = rawEnabledSkills.filter(isString);

	const setEnabledSkills = (enabledSkills: string[]) => {
		setPreference({ key: 'enabledSkills', value: enabledSkills });
	};

	return { enabledSkills, setEnabledSkills };
}

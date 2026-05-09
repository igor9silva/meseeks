import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';

type PreferenceKey =
	| 'inboxWidthPercent'
	| 'taskDetailWidthPercentDesktop'
	| 'enabledSkills'
	| 'taskListVisible'
	| 'taskDetailVisible';

export function usePreferenceValue(key: PreferenceKey) {
	//
	const query = convexQuery(api.users.preferences.get, { key });
	const { data: preference } = useSuspenseQuery(query);

	return preference?.value;
}

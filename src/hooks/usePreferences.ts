import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { useMutation } from 'convex/react';

export function usePreferences({ defaultValue }: { defaultValue?: any } = {}) {
	//
	const setPreference = useMutation(api.users.preferences.public.setPreference);
	const getPreference = (key: string) => {
		//
		const query = convexQuery(api.users.preferences.public.getPreference, { key });
		const { data: preference } = useSuspenseQuery(query);

		return preference?.value;
	};

	const setInboxWidthPercent = (widthPercent: number) => {
		return setPreference({ key: 'inboxWidthPercent', value: widthPercent });
	};

	const getInboxWidthPercent = () => {
		//
		const preference = getPreference('inboxWidthPercent');
		const fallback = typeof defaultValue === 'number' ? defaultValue : 50;

		return typeof preference === 'number' ? preference : fallback;
	};

	const setTaskDetailWidthPercentDesktop = (widthPercent: number) => {
		return setPreference({ key: 'taskDetailWidthPercentDesktop', value: widthPercent });
	};

	const getTaskDetailWidthPercentDesktop = () => {
		//
		const preference = getPreference('taskDetailWidthPercentDesktop');
		const fallback = typeof defaultValue === 'number' ? defaultValue : 50;

		return typeof preference === 'number' ? preference : fallback;
	};

	const setTaskDetailWidthPercentMobile = (widthPercent: number) => {
		return setPreference({ key: 'taskDetailWidthPercentMobile', value: widthPercent });
	};

	const getTaskDetailWidthPercentMobile = () => {
		//
		const preference = getPreference('taskDetailWidthPercentMobile');
		const fallback = typeof defaultValue === 'number' ? defaultValue : 50;

		return typeof preference === 'number' ? preference : fallback;
	};

	const setEnabledSkills = (enabledSkills: string[]) => {
		//
		return setPreference({ key: 'enabledSkills', value: enabledSkills });
	};

	const getEnabledSkills = (): string[] => {
		//
		const enabledSkills = getPreference('enabledSkills');
		const defaultSkills = Array.isArray(defaultValue) ? defaultValue : [];

		const isString = (value: unknown): value is string => typeof value === 'string';

		if (Array.isArray(enabledSkills)) {
			return enabledSkills.filter(isString);
		}

		return defaultSkills.filter(isString);
	};

	return {
		setInboxWidthPercent,
		getInboxWidthPercent,
		setTaskDetailWidthPercentDesktop,
		getTaskDetailWidthPercentDesktop,
		setTaskDetailWidthPercentMobile,
		getTaskDetailWidthPercentMobile,
		setEnabledSkills,
		getEnabledSkills,
	};
}

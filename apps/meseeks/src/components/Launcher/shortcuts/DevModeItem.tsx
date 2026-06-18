import { useRouter } from '@tanstack/react-router';
import { CodeXml } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';
import { useLauncher } from '../LauncherProvider';

export function DevModeItem() {
	//
	const { close } = useLauncher();
	const router = useRouter();
	const search = new URLSearchParams(router.state.location.searchStr);
	const isDebugMode = search.get('debug') === 'true';

	const handleToggleDebug = () => {
		//
		if (isDebugMode) {
			search.delete('debug');
		} else {
			search.set('debug', 'true');
		}

		const nextSearch = search.toString();
		const nextUrl = `${router.state.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
		router.history.push(nextUrl);
		close();
	};

	return (
		<CommandItem
			value="toggle-debug"
			keywords={['debug', 'dev', 'development', 'toggle']}
			onSelect={handleToggleDebug}
		>
			<CodeXml className="mr-2" />
			{isDebugMode ? 'Disable' : 'Enable'} Dev Mode
		</CommandItem>
	);
}

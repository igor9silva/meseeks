import { useLocation, useNavigate } from '@tanstack/react-router';
import { CodeXml } from 'lucide-react';
import { CommandItem } from '@pro/ui/command';
import { useLauncher } from '../LauncherProvider';

export function DevModeItem() {
	//
	const { close } = useLauncher();
	const navigate = useNavigate();
	const { pathname, search } = useLocation();
	const isDebugMode = Boolean(search.debug);

	const handleToggleDebug = () => {
		//
		navigate({
			to: pathname,
			search: (prev) => ({ ...prev, debug: isDebugMode ? undefined : true }),
		});
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

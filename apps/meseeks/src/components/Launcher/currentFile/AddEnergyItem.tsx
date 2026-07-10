import { useLocation, useNavigate } from '@tanstack/react-router';
import { CircleCheckBig } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';
import { useLauncher } from '../LauncherProvider';
import type { CurrentFile } from '../types';

export function AddEnergyItem({ file }: { file: CurrentFile }) {
	//
	const { close } = useLauncher();
	const navigate = useNavigate();
	const location = useLocation();
	if (!file.isActive) return null;

	const handleSelect = () => {
		//
		navigate({
			to: location.pathname,
			search: (prev) => ({ ...prev, isEnergyDrawerOpen: true }),
		});
		close();
	};

	return (
		<CommandItem keywords={['energy', 'budget', 'add', 'increase']} onSelect={handleSelect}>
			<CircleCheckBig className="mr-2" />
			Add energy
		</CommandItem>
	);
}

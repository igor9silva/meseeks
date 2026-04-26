import { useLocation, useNavigate } from '@tanstack/react-router';
import { CircleCheckBig } from 'lucide-react';
import { CommandItem } from '~/components/ui/command';
import { useLauncher } from '../LauncherProvider';
import type { CurrentTask } from '../types';

export function AddEnergyItem({ task }: { task: CurrentTask }) {
	//
	const { close } = useLauncher();
	const navigate = useNavigate();
	const location = useLocation();
	if (!task.isActive) return null;

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

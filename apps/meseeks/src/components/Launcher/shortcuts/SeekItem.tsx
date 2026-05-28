import { useNavigate } from '@tanstack/react-router';
import { useCommandState } from '@reactor/ui/command-state';
import { SquarePen } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';
import { useLauncher } from '../LauncherProvider';

export function SeekItem({ shouldUseSearch }: { shouldUseSearch: boolean }) {
	//
	const { close } = useLauncher();
	const navigate = useNavigate();
	const typedSearch = useCommandState((state) => state.search);

	const search = (() => {
		if (!shouldUseSearch) return '';
		return typedSearch;
	})();

	const handleSelect = () => {
		//
		navigate({
			to: '/$',
			params: { _splat: 'new' },
			search: search ? { q: search } : {},
		});

		close();
		//
	};

	if (!search) return null;

	return (
		<CommandItem value="/seek" keywords={['seek', 'search', search]} onSelect={handleSelect}>
			<SquarePen className="mr-2" />
			{`Seek for "${search}"`}
		</CommandItem>
	);
}

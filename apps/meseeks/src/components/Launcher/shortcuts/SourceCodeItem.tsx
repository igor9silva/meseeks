import { Github } from 'lucide-react';
import { CommandItem } from '~/components/ui/command';

export function SourceCodeItem({ onClose }: { onClose: () => void }) {
	//
	const handleSelect = () => {
		//
		window.open('https://github.com/igor9silva/meseeks', '_blank');
		onClose();
	};

	return (
		<CommandItem value="github" keywords={['github', 'source', 'code', 'repository']} onSelect={handleSelect}>
			<Github className="mr-2" />
			View source code on GitHub
		</CommandItem>
	);
}

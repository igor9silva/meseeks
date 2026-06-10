import { RefreshCcw } from 'lucide-react';
import { CommandItem } from '@pro/ui/command';

export function RefreshItem() {
	//
	return (
		<CommandItem value="refresh" keywords={['refresh']} onSelect={() => window.location.reload()}>
			<RefreshCcw className="mr-2" />
			Refresh
		</CommandItem>
	);
}

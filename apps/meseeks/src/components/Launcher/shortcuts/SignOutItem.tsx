import { LogOut } from 'lucide-react';
import { signOutAndReload } from 'lib/auth-client';
import { CommandItem } from '@pro/ui/command';

export function SignOutItem() {
	//
	return (
		<CommandItem value="signout" keywords={['sign', 'out']} onSelect={signOutAndReload}>
			<LogOut className="mr-2" />
			Sign out
		</CommandItem>
	);
}

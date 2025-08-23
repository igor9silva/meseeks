import { useAuthActions } from '@convex-dev/auth/react';
import { Button } from '~/components/ui/button';

export function Onboarding() {
	//
	const { signIn } = useAuthActions();

	const handleSignIn = () => {
		console.log('signing in');
		signIn('google', { redirectTo: location.href });
	};

	return (
		<div className="flex flex-col gap-8 my-6 h-full p-4">
			<div className="text-center space-y-4">
				<Button onClick={handleSignIn} className="text-4xl font-bold tracking-tight">
					Welcome to Meseeks
				</Button>
			</div>
			<footer className="absolute bottom-4 text-sm text-muted-foreground flex gap-4">
				<a
					href="/static/privacy-policy.md"
					className="hover:underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Privacy Policy
				</a>
				<span>•</span>
				<a
					href="https://github.com/igor9silva/meseeks"
					className="hover:underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					GitHub
				</a>
			</footer>
		</div>
	);
}

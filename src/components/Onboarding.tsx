import { useAuthActions } from '@convex-dev/auth/react';

export function Onboarding() {
	//
	const { signIn } = useAuthActions();

	return (
		<div className="flex flex-col gap-8 my-6 h-full p-4">
			<div className="text-center space-y-4">
				<h1 className="text-4xl font-bold tracking-tight">Welcome to Meseeks</h1>
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

import { useLocation, useRouter } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { signIn } from 'lib/auth-client';
import { z } from 'zod';
import { LoadingButton } from '~/components/ui/loading-button';

const authErrorSearchSchema = z.object({
	error: z.string().optional(),
});

export function AccessDenied() {
	//
	const router = useRouter();
	const { pathname, hash, search } = useLocation();
	const [isSigningIn, setIsSigningIn] = useState(false);
	const authError = authErrorSearchSchema.parse(search).error;

	const callbackUrl = useMemo(() => {
		//
		// use the router's location builder so auth callbacks follow the same search serialization rules
		// as the rest of the app while stripping the one-off oauth error param.
		const callbackPath = router.buildLocation({
			to: pathname,
			hash,
			search: (prev) => ({ ...prev, error: undefined }),
		}).href;

		// better-auth wants a full callback url in the browser, but the router now returns href strings here.
		if (typeof window === 'undefined') return callbackPath;

		return new URL(callbackPath, window.location.origin).href;
		//
	}, [hash, pathname, router]);

	const errorMessage = useMemo(() => {
		//
		if (!authError) return;
		if (authError === 'unable_to_create_user') return 'We could not create your account. Try again.';

		return `Sign in failed: ${authError}`;
		//
	}, [authError]);

	const handleSignIn = async () => {
		//
		setIsSigningIn(true);

		await signIn
			.social({
				provider: 'google',
				callbackURL: callbackUrl,
			})
			.catch(() => {
				setIsSigningIn(false);
			});
	};

	return (
		<div className="h-screen w-full flex flex-col items-center justify-center gap-4">
			<div className="flex flex-wrap items-center justify-center gap-3">
				<LoadingButton onClick={handleSignIn} loading={isSigningIn} loadingText="Redirecting...">
					Continue with Google
				</LoadingButton>
				{errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
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

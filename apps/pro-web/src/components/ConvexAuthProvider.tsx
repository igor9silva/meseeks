import { ConvexProviderWithAuth, type ConvexReactClient } from 'convex/react';
import { convexJwtCookieNames } from 'lib/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod/v3';
import { getConvexToken } from 'lib/auth-client';

const tokenRefreshLeewaySeconds = 60;
const tokenRefreshLeadMs = 1000 * 60 * 60 * 24 * 3; // 3 day
const jwtPayloadSchema = z.object({
	exp: z.number(),
});

export function ConvexAuthProvider({ children, client }: { children: React.ReactNode; client: ConvexReactClient }) {
	//
	return (
		<ConvexProviderWithAuth client={client} useAuth={useCookieBackedConvexAuth}>
			{children}
		</ConvexProviderWithAuth>
	);
}

function useCookieBackedConvexAuth() {
	//
	const [hasLoadedToken, setHasLoadedToken] = useState(false);
	const [token, setToken] = useState<string | null>(null);
	const tokenRef = useRef<string | null>(null);

	useEffect(() => {
		const initialToken = readConvexJwtCookie();
		tokenRef.current = initialToken;
		setToken(initialToken);
		setHasLoadedToken(true);
	}, []);

	useEffect(() => {
		//
		// better auth only rolls its session cookie on an /api/auth http response.
		// convex websocket traffic keeps the app alive, but it cannot extend that
		// browser cookie. when the tab becomes visible again and the cached convex
		// jwt is nearing expiry, refresh it once in the background instead of
		// paying an auth request before first render.
		if (!token) return;

		let isCancelled = false;
		let isRefreshing = false;

		const handleVisibilityChange = () => {
			//
			if (document.visibilityState !== 'visible') return;

			const currentToken = readConvexJwtCookie();
			if (currentToken !== tokenRef.current) {
				tokenRef.current = currentToken;
				setToken(currentToken);
			}

			if (!currentToken) return;
			if (!shouldRefreshConvexJwt(currentToken)) return;
			if (isRefreshing) return;

			isRefreshing = true;

			void requestConvexToken()
				.then((nextToken) => {
					//
					if (isCancelled || !nextToken) return;

					tokenRef.current = nextToken;
					setToken(nextToken);
				})
				.finally(() => {
					isRefreshing = false;
				});
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			isCancelled = true;
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [token]);

	const fetchAccessToken = useCallback(async () => {
		//
		// convex asks for a token through this callback; reading the cached jwt
		// here keeps reloads close to the old convex auth behavior while
		// avoiding auth http on normal app startup.
		const cachedToken = readConvexJwtCookie();
		if (cachedToken !== tokenRef.current) {
			tokenRef.current = cachedToken;
			setToken(cachedToken);
		}

		return cachedToken;
	}, []);

	return useMemo(
		() => ({
			isLoading: !hasLoadedToken,
			isAuthenticated: Boolean(token),
			fetchAccessToken,
		}),
		[fetchAccessToken, hasLoadedToken, token],
	);
}

async function requestConvexToken() {
	//
	return getConvexToken({ fetchOptions: { throw: false } })
		.then(({ data }) => {
			//
			const candidateToken = data?.token;
			if (!candidateToken || !isUsableConvexJwt(candidateToken)) return null;

			return candidateToken;
		})
		.catch(() => {
			return null;
		});
}

function readConvexJwtCookie() {
	//
	if (typeof document === 'undefined') return null;

	// better auth names component cookies with a prefix, so support both the base
	// cookie name and the component-prefixed variant.
	const cookies = document.cookie.split('; ');

	for (const cookieName of convexJwtCookieNames) {
		//
		const cookie = cookies.find((entry) => entry.startsWith(`${cookieName}=`));
		if (!cookie) continue;

		const value = cookie.slice(cookieName.length + 1);
		if (isUsableConvexJwt(value)) return value;
	}

	return null;
}

function isUsableConvexJwt(token: string | undefined) {
	//
	if (!token) return false;

	const payload = parseJwtPayload(token);
	if (!payload) return false;

	const nowInSeconds = Math.floor(Date.now() / 1000);
	return payload.exp > nowInSeconds + tokenRefreshLeewaySeconds;
}

function shouldRefreshConvexJwt(token: string) {
	//
	const payload = parseJwtPayload(token);
	if (!payload) return false;

	return payload.exp * 1000 - Date.now() <= tokenRefreshLeadMs;
}

function parseJwtPayload(token: string) {
	//
	const encodedPayload = token.split('.')[1];
	if (!encodedPayload || typeof window === 'undefined') return null;

	const normalizedPayload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
	const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');

	try {
		const decodedPayload = window.atob(paddedPayload);
		const parsedPayload = JSON.parse(decodedPayload);
		const result = jwtPayloadSchema.safeParse(parsedPayload);

		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

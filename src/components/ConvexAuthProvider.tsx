import { ConvexProviderWithAuth, type ConvexReactClient } from 'convex/react';
import { convexJwtCookieNames } from 'lib/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { getConvexToken } from 'lib/auth-client';

const tokenRefreshLeewaySeconds = 60;
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
	const pendingTokenRef = useRef<Promise<string | null> | null>(null);
	const tokenRef = useRef<string | null>(null);

	useEffect(() => {
		const initialToken = readConvexJwtCookie();
		tokenRef.current = initialToken;
		setToken(initialToken);
		setHasLoadedToken(true);
	}, []);

	const fetchAccessToken = useCallback(
		async ({ forceRefreshToken = false }: { forceRefreshToken?: boolean } = {}) => {
			//
			// convex asks for a token through this callback; reading the cached jwt
			// here keeps reloads close to the old convex auth behavior.
			const cachedToken = readConvexJwtCookie();

			if (!forceRefreshToken && cachedToken) {
				//
				if (cachedToken !== tokenRef.current) {
					tokenRef.current = cachedToken;
					setToken(cachedToken);
				}

				return cachedToken;
			}

			if (!forceRefreshToken && pendingTokenRef.current) return pendingTokenRef.current;

			pendingTokenRef.current = getConvexToken({ fetchOptions: { throw: false } })
				.then(({ data }) => {
					//
					const candidateToken = data?.token;
					if (!candidateToken || !isUsableConvexJwt(candidateToken)) {
						tokenRef.current = null;
						setToken(null);
						return null;
					}

					const nextToken: string = candidateToken;
					tokenRef.current = nextToken;
					setToken(nextToken);

					return nextToken;
				})
				.catch(() => {
					tokenRef.current = null;
					setToken(null);
					return null;
				})
				.finally(() => {
					pendingTokenRef.current = null;
				});

			return pendingTokenRef.current;
		},
		[],
	);

	return useMemo(
		() => ({
			isLoading: !hasLoadedToken,
			isAuthenticated: Boolean(token),
			fetchAccessToken,
		}),
		[fetchAccessToken, hasLoadedToken, token],
	);
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

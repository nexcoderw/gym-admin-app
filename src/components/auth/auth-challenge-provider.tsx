'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import type { MfaChallenge } from '@/lib/contracts/auth';

type AuthPhase =
	| { readonly phase: 'password' }
	| { readonly phase: 'verification'; readonly challenge: MfaChallenge };

interface AuthChallengeContextValue {
	readonly state: AuthPhase;
	readonly beginVerification: (challenge: MfaChallenge) => void;
	readonly clearChallenge: () => void;
}

const AuthChallengeContext = createContext<AuthChallengeContextValue | null>(null);

/** Scoped to the auth layout: challenges never enter URLs, cookies or browser storage. */
export function AuthChallengeProvider({ children }: { readonly children: ReactNode }) {
	const [state, setState] = useState<AuthPhase>({ phase: 'password' });
	const beginVerification = useCallback((challenge: MfaChallenge) => {
		setState({ phase: 'verification', challenge });
	}, []);
	const clearChallenge = useCallback(() => {
		setState({ phase: 'password' });
	}, []);

	return (
		<AuthChallengeContext.Provider value={{ state, beginVerification, clearChallenge }}>
			{children}
		</AuthChallengeContext.Provider>
	);
}

export function useAuthChallenge() {
	const context = useContext(AuthChallengeContext);
	if (!context) throw new Error('The sign-in flow requires its auth layout.');
	return context;
}

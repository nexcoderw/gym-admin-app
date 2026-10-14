import type { ReactNode } from 'react';

import { AuthChallengeProvider } from '@/components/auth/auth-challenge-provider';

export default function AuthLayout({ children }: { readonly children: ReactNode }) {
	return <AuthChallengeProvider>{children}</AuthChallengeProvider>;
}

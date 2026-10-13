import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
	title: { default: 'NEXCODE Platform', template: '%s | NEXCODE Platform' },
	description: 'Private NEXCODE Gym platform administration.',
	robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body><a className="skip-link" href="#main">Skip to content</a>{children}</body>
		</html>
	);
}

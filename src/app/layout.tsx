import type { Metadata } from 'next';
import { Albert_Sans, DM_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';

const headingFont = Albert_Sans({
	subsets: ['latin'],
	variable: '--font-albert-sans',
	display: 'swap',
});

const bodyFont = DM_Sans({
	subsets: ['latin'],
	variable: '--font-dm-sans',
	display: 'swap',
});

export const metadata: Metadata = {
	title: { default: 'NEXCODE Platform', template: '%s | NEXCODE Platform' },
	description: 'Private NEXCODE Gym platform administration.',
	robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
			<body>
				<a className="skip-link" href="#main">
					Skip to content
				</a>
				{children}
			</body>
		</html>
	);
}

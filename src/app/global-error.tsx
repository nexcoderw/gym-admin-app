'use client';

import { RecoveryState } from '@/components/shared/recovery-state';
import type { RecoveryBoundaryProps } from '@/components/shared/state-content';
import { bodyFont, headingFont } from './fonts';
import './globals.css';

/** This document must remain independent of the root layout and its providers. */
export default function GlobalError({ retry, reset }: RecoveryBoundaryProps) {
	return (
		<html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
			<head>
				<title>Workspace unavailable | NEXCODE Platform</title>
				<meta name="robots" content="noindex, nofollow" />
			</head>
			<body>
				<a className="skip-link" href="#main">
					Skip to content
				</a>
				<RecoveryState kind="500" onRetry={retry ?? reset} />
			</body>
		</html>
	);
}

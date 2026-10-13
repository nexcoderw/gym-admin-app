import { Albert_Sans, DM_Sans } from 'next/font/google';

/** Shared with the fatal-error document, which replaces rather than inherits the root layout. */
export const headingFont = Albert_Sans({
	subsets: ['latin'],
	variable: '--font-albert-sans',
	display: 'swap',
});

export const bodyFont = DM_Sans({
	subsets: ['latin'],
	variable: '--font-dm-sans',
	display: 'swap',
});

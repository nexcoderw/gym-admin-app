// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StatePanel } from '@/components/shared/state-panel';
import { RecoveryState } from '@/components/shared/recovery-state';
import { stateContent } from '@/components/shared/state-content';
import DashboardError from '@/app/dashboard/error';
import GlobalError from '@/app/global-error';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { summary } from './fixtures';
import { BrandLogo } from '@/components/shared/brand-logo';

vi.mock('@/app/fonts', () => ({
	headingFont: { variable: 'heading-font' },
	bodyFont: { variable: 'body-font' },
}));

afterEach(cleanup);

describe('workspace recovery and empty states', () => {
	it('keeps the public logo and browser icon geometry identical', async () => {
		const mark = await readFile(new URL('../public/nexcode-mark.svg', import.meta.url), 'utf8');
		const icon = await readFile(new URL('../src/app/icon.svg', import.meta.url), 'utf8');
		expect(icon).toBe(mark);
		expect(icon).toContain('viewBox="0 0 64 64"');
	});

	it('renders the brand with a decorative SVG mark and accessible wordmark', () => {
		const view = render(<BrandLogo />);
		expect(screen.getByText('NEXCODE')).toBeDefined();
		expect(screen.getByText('Gym platform')).toBeDefined();
		const mark = view.container.querySelector('img');
		expect(mark?.getAttribute('src')).toContain('/nexcode-mark.svg');
		expect(mark?.getAttribute('alt')).toBe('');
	});
	it.each(['401', '403', '404', '429', '500', '503'] as const)(
		'renders the %s state with one main heading, SVG illustration, and navigation actions',
		(kind) => {
			const view = render(<RecoveryState kind={kind} />);
			expect(screen.getByRole('main').id).toBe('main');
			expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(stateContent[kind].title);
			expect(view.container.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
			const links = screen.getAllByRole('link');
			expect(links).toHaveLength(2);
			for (const link of links) {
				expect(['/', '/login', '/dashboard']).toContain(link.getAttribute('href'));
				expect(link.querySelector('svg')).not.toBeNull();
			}
		},
	);

	it('uses the fixed sign-in route without accepting a return destination', () => {
		render(<RecoveryState kind="401" />);
		expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
	});

	it('prefers Next retry over legacy reset and never renders raw error details', () => {
		const retry = vi.fn<() => void>();
		const reset = vi.fn<() => void>();
		render(
			<DashboardError
				error={new Error('fictional SQL password=never-render')}
				retry={retry}
				reset={reset}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(retry).toHaveBeenCalledOnce();
		expect(reset).not.toHaveBeenCalled();
		expect(screen.queryByText(/never-render/)).toBeNull();
		expect(screen.queryByRole('main')).toBeNull();
	});

	it('keeps the shared loading indicator and label while retry is pending', async () => {
		const gate = Promise.withResolvers<void>();
		const retry = vi.fn(async () => {
			await gate.promise;
		});
		render(<RecoveryState kind="503" onRetry={retry} />);
		try {
			const button = screen.getByRole('button', { name: 'Try again' });
			fireEvent.click(button);
			expect(button.hasAttribute('disabled')).toBe(true);
			expect(button.getAttribute('aria-busy')).toBe('true');
			expect(button.querySelectorAll('[data-loading-indicator]')).toHaveLength(1);
			fireEvent.click(button);
			expect(retry).toHaveBeenCalledOnce();
		} finally {
			await act(async () => {
				gate.resolve();
				await gate.promise;
			});
		}
		expect(screen.getByRole('button', { name: 'Try again' }).hasAttribute('disabled')).toBe(false);
	});

	it('announces loading without providing mutation or retry controls', () => {
		render(<StatePanel kind="loading" />);
		expect(screen.getByRole('status').textContent).toContain('Loading current platform records');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('shows an empty staff state only for a successful zero-total response', () => {
		render(
			<DashboardOverview
				summary={{
					...summary,
					platformStaff: { total: 0, pending: 0, active: 0, suspended: 0, revoked: 0 },
				}}
			/>,
		);
		expect(screen.getByRole('heading', { name: 'No staff assignments yet' })).toBeDefined();
		expect(screen.getByRole('button', { name: 'Refresh records' })).toBeDefined();
		expect(screen.queryByRole('button', { name: /create|invite/i })).toBeNull();
		expect(screen.getByText('Global accounts')).toBeDefined();
	});

	it('preserves the populated staff summary instead of showing an empty state', () => {
		render(<DashboardOverview summary={summary} />);
		expect(screen.queryByText('No staff assignments yet')).toBeNull();
		expect(screen.getByText('Active')).toBeDefined();
	});

	it('gives the fatal fallback its own light-themed document and font classes', () => {
		const markup = renderToStaticMarkup(<GlobalError retry={() => undefined} />);
		expect(markup).toContain('<html lang="en" class="heading-font body-font">');
		expect(markup).toContain('<body>');
		expect(markup).toContain('noindex, nofollow');
		expect(markup).toContain('Skip to content');
		expect(markup).toContain('Something interrupted this page');
	});
});

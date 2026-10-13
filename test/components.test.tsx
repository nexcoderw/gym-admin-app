// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { Card } from '@/components/shared/card';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { visibleNavigation } from '@/constants/navigation';
import { routes, browserApi } from '@/constants/routes';
import { summary } from './fixtures';
import Loading from '@/app/dashboard/loading';
import DashboardError from '@/app/dashboard/error';

afterEach(cleanup);
describe('accessible UI foundation', () => {
	it('associates input label, hint and error with a native input', () => {
		render(<Input id="email" label="Email address" hint="Use your account email" error="Email is required" />);
		const input = screen.getByLabelText('Email address');
		expect(input.getAttribute('aria-describedby')).toBe('email-hint email-error');
		expect(input.getAttribute('aria-invalid')).toBe('true');
	});
	it('prevents duplicate interaction while pending', () => {
		let clicks = 0;
		render(<Button pending onClick={() => { clicks += 1; }}>Continue</Button>);
		const button = screen.getByRole('button', { name: 'Continue' });
		fireEvent.click(button);
		expect(button.hasAttribute('disabled')).toBe(true);
		expect(button.getAttribute('aria-busy')).toBe('true');
		expect(clicks).toBe(0);
	});
	it('renders shared cards and actual summary fields without fabricated domains', () => {
		render(<Card><DashboardOverview summary={summary} /></Card>);
		expect(screen.getByText('Global accounts')).toBeDefined();
		expect(screen.getByText('Staff assignment status')).toBeDefined();
		expect(screen.queryByText('Revenue')).toBeNull();
	});
	it('keeps route constants frontend-only and filters navigation by permission, not role', () => {
		expect(routes.dashboard).toBe('/dashboard');
		expect(Object.values(browserApi).every((path) => path.startsWith('/api/') && !path.includes('/v1/'))).toBe(true);
		expect(visibleNavigation([])).toHaveLength(0);
		expect(visibleNavigation(['platform.owner'])).toHaveLength(0);
		expect(visibleNavigation(['platform.dashboard.read']).map((item) => item.key)).toEqual(['overview']);
	});
	it('announces loading and offers a retry instead of fabricated error statistics', () => {
		const loading = render(<Loading />);
		expect(screen.getByRole('status').textContent).toContain('Loading current platform records');
		loading.unmount();
		const reset = vi.fn<() => void>();
		render(<DashboardError reset={reset} />);
		fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(reset).toHaveBeenCalledOnce();
		expect(screen.queryByText('Global accounts')).toBeNull();
	});
});

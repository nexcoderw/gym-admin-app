// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionLifecycle } from '@/components/auth/session-lifecycle';

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
const router = { replace, refresh };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const fetchMock = vi.fn<typeof fetch>();
const now = new Date('2030-01-01T00:00:00Z');

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(now);
	vi.stubGlobal('fetch', fetchMock);
	fetchMock.mockReset();
	replace.mockClear();
	refresh.mockClear();
	Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('protected workspace session lifecycle', () => {
	it('checks at expiry and leaves the workspace only after a confirmed 401', async () => {
		fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
		render(<SessionLifecycle expiresAt="2030-01-01T00:00:01Z" />);
		expect(fetchMock).not.toHaveBeenCalled();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000);
		});
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/auth/session',
			expect.objectContaining({
				credentials: 'same-origin',
				cache: 'no-store',
				redirect: 'error',
			}),
		);
		expect(replace).toHaveBeenCalledWith('/login');
		expect(refresh).toHaveBeenCalledOnce();
	});

	it.each([200, 403, 429, 502])('does not log out on a %s response', async (status) => {
		fetchMock.mockResolvedValue(new Response(null, { status }));
		render(<SessionLifecycle expiresAt="2030-01-01T00:00:01Z" />);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000);
		});
		expect(replace).not.toHaveBeenCalled();
	});

	it('does not log out when the network fails', async () => {
		fetchMock.mockRejectedValue(new Error('Fictional network failure'));
		render(<SessionLifecycle expiresAt="2030-01-01T00:00:01Z" />);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000);
		});
		expect(replace).not.toHaveBeenCalled();
	});

	it('rechecks on focus without polling and cleans up when unmounted', async () => {
		fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
		const view = render(<SessionLifecycle expiresAt="2030-01-01T08:00:00Z" />);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60_000);
		});
		expect(fetchMock).not.toHaveBeenCalled();
		await act(async () => {
			window.dispatchEvent(new Event('focus'));
		});
		expect(fetchMock).toHaveBeenCalledOnce();
		view.unmount();
		await act(async () => {
			window.dispatchEvent(new Event('focus'));
			await vi.advanceTimersByTimeAsync(28_800_000);
		});
		expect(fetchMock).toHaveBeenCalledOnce();
	});
});

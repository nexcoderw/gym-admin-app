// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Pagination } from '@/components/shared/pagination';

afterEach(cleanup);

function renderPagination(
	overrides: Partial<{ page: number; pageCount: number; totalItems: number; pending: boolean }> = {},
) {
	const onPageChange = vi.fn<(page: number) => void>();
	render(
		<Pagination
			label="Fictional pages"
			page={overrides.page ?? 5}
			pageCount={overrides.pageCount ?? 9}
			pageSize={20}
			itemCount={20}
			totalItems={overrides.totalItems}
			pending={overrides.pending}
			onPageChange={onPageChange}
		/>,
	);
	return onPageChange;
}

function visibleLabels() {
	const nav = screen.getByRole('navigation', { name: 'Fictional pages' });
	// Gaps are aria-hidden, so include hidden items to check the visual order.
	return within(nav)
		.getAllByRole('listitem', { hidden: true })
		.map((item) => item.textContent);
}

describe('shared pagination', () => {
	it('renders nothing when there is only one page', () => {
		renderPagination({ page: 1, pageCount: 1 });
		expect(screen.queryByRole('navigation')).toBeNull();
	});

	it('shows first, last and neighbours with hidden gaps, the range and the current page', () => {
		renderPagination({ totalItems: 170 });
		expect(visibleLabels()).toEqual(['', '1', '…', '4', '5', '6', '…', '9', '']);
		const current = screen.getByRole('button', { name: 'Page 5' });
		expect(current.getAttribute('aria-current')).toBe('page');
		expect(screen.getByText('81–100').parentElement?.textContent).toBe('Showing 81–100 of 170');
		for (const gap of screen.getAllByText('…')) expect(gap.getAttribute('aria-hidden')).toBe('true');
	});

	it('shows a single skipped page as a number instead of a gap', () => {
		renderPagination({ page: 4 });
		expect(visibleLabels()).toEqual(['', '1', '2', '3', '4', '5', '…', '9', '']);
	});

	it('moves with arrows and numbers, disabling only the arrows at the ends', () => {
		const onPageChange = renderPagination({ page: 1, pageCount: 3 });
		expect(screen.getByRole('button', { name: 'Previous page' }).hasAttribute('disabled')).toBe(true);
		fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
		fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));
		fireEvent.click(screen.getByRole('button', { name: 'Page 1' }));
		expect(onPageChange.mock.calls).toEqual([[2], [3]]);
	});

	it('keeps controls focusable but ignores presses while a page is loading', () => {
		const onPageChange = renderPagination({ pending: true });
		const next = screen.getByRole('button', { name: 'Next page' });
		expect(next.hasAttribute('disabled')).toBe(false);
		fireEvent.click(next);
		fireEvent.click(screen.getByRole('button', { name: 'Page 6' }));
		expect(onPageChange).not.toHaveBeenCalled();
		expect(screen.getByRole('navigation').getAttribute('aria-busy')).toBe('true');
	});
});

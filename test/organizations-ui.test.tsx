// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationForm } from '@/components/organizations/organization-form';
import { OrganizationList } from '@/components/organizations/organization-list';
import { OrganizationDetails } from '@/components/organizations/organization-details';
import { visibleNavigation } from '@/constants/navigation';
import { organizationPermissions } from '@/lib/contracts/organizations';
import { organization, organizationEtag } from './organization-fixtures';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	router.replace.mockReset();
	router.refresh.mockReset();
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
	Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
		configurable: true,
		value: function (this: HTMLDialogElement) {
			this.open = true;
		},
	});
	Object.defineProperty(HTMLDialogElement.prototype, 'close', {
		configurable: true,
		value: function (this: HTMLDialogElement) {
			this.open = false;
		},
	});
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function fillRegistration(slug = 'soho') {
	fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: 'Soho Gym' } });
	fireEvent.change(screen.getByLabelText('Slug'), { target: { value: slug } });
}

describe('organization management interactions', () => {
	it('associates create validation errors with both fields without sending a request', () => {
		const view = render(<OrganizationForm mode="create" />);
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: '   ' } });
		fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'admin' } });
		const form = view.container.querySelector('form');
		if (!form) throw new Error('Expected native organization form.');
		fireEvent.submit(form);
		for (const label of ['Gym name', 'Slug']) {
			const input = screen.getByLabelText(label);
			expect(input.getAttribute('aria-invalid')).toBe('true');
			const descriptionIds = input.getAttribute('aria-describedby')?.split(' ') ?? [];
			const fieldError = descriptionIds.find((id) => id.endsWith('-error'));
			expect(fieldError).toBeDefined();
			expect(fieldError ? document.getElementById(fieldError)?.textContent : null).toBeTruthy();
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('shows an edit name validation error without requiring a slug or sending a request', () => {
		const view = render(
			<OrganizationForm mode="edit" organization={organization} etag={organizationEtag} />,
		);
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: '   ' } });
		const form = view.container.querySelector('form');
		if (!form) throw new Error('Expected native organization form.');
		fireEvent.submit(form);
		expect(screen.getByLabelText('Gym name').getAttribute('aria-invalid')).toBe('true');
		expect(screen.queryByLabelText('Slug')).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('renders an honest empty state and hides registration without permission', () => {
		render(
			<OrganizationList
				data={{ items: [], nextCursor: null }}
				query={{ limit: 20 }}
				canCreate={false}
			/>,
		);
		expect(screen.getByText('No gyms registered yet')).toBeDefined();
		expect(screen.queryByRole('link', { name: 'Register Gym' })).toBeNull();
		expect(visibleNavigation(['platform.owner'])).toHaveLength(0);
		expect(visibleNavigation([organizationPermissions.read]).map((entry) => entry.key)).toEqual([
			'organizations',
		]);
	});
	it('renders real rows, preserves status on next cursor and resets cursor on filtering', () => {
		render(
			<OrganizationList
				data={{ items: [organization], nextCursor: organization.id }}
				query={{ limit: 20, status: 'PENDING' }}
				canCreate
			/>,
		);
		expect(screen.getByRole('link', { name: 'Soho Gym' }).getAttribute('href')).toBe(
			`/organizations/${organization.id}`,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Next results' }));
		expect(router.replace).toHaveBeenCalledWith(
			`/organizations?limit=20&status=PENDING&cursor=${organization.id}`,
		);
		fireEvent.change(screen.getByLabelText('Lifecycle status'), { target: { value: 'ACTIVE' } });
		expect(router.replace).toHaveBeenLastCalledWith('/organizations?limit=20&status=ACTIVE');
	});
	it.each(['admin', 'Soho', 'soho--gym'])(
		'rejects invalid registration slug %s without a request',
		(slug) => {
			const view = render(<OrganizationForm mode="create" />);
			fillRegistration(slug);
			const form = view.container.querySelector('form');
			if (!form) throw new Error('Expected native organization form.');
			fireEvent.submit(form);
			expect(screen.getByRole('alert').textContent).toContain('Check');
			expect(fetchMock).not.toHaveBeenCalled();
		},
	);
	it('prevents duplicates, keeps the shared spinner and navigates only after a genuine 201', async () => {
		let resolve: (value: Response) => void = () => {
			throw new Error('Deferred request not initialized.');
		};
		fetchMock.mockImplementationOnce(
			() =>
				new Promise<Response>((done) => {
					resolve = done;
				}),
		);
		const view = render(<OrganizationForm mode="create" />);
		fillRegistration();
		const form = view.container.querySelector('form');
		if (!form) throw new Error('Expected native form.');
		fireEvent.submit(form);
		fireEvent.submit(form);
		const button = screen.getByRole('button', { name: 'Register Gym' });
		expect(button.hasAttribute('disabled')).toBe(true);
		expect(button.querySelector('[data-loading-indicator]')).not.toBeNull();
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(router.replace).not.toHaveBeenCalled();
		await act(async () => {
			resolve(Response.json(organization, { status: 201 }));
		});
		expect(router.replace).toHaveBeenCalledWith(`/organizations/${organization.id}`);
	});
	it.each([
		[409, 'ORGANIZATION_SLUG_CONFLICT', 'already registered'],
		[503, 'ORGANIZATION_AUDIT_UNAVAILABLE', 'audit setup'],
	] as const)(
		'shows safe registration failure %s without success navigation',
		async (status, code, message) => {
			fetchMock.mockResolvedValueOnce(
				Response.json({ error: { code, message: 'secret provider text' } }, { status }),
			);
			const view = render(<OrganizationForm mode="create" />);
			fillRegistration();
			const form = view.container.querySelector('form');
			if (!form) throw new Error('Expected form.');
			fireEvent.submit(form);
			await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(message));
			expect(router.replace).not.toHaveBeenCalled();
			expect(screen.getByLabelText('Gym name').getAttribute('disabled')).toBeNull();
		},
	);
	it('blocks an ambiguous creation until the administrator reviews the registry', async () => {
		fetchMock.mockRejectedValueOnce(new Error('Private network diagnostics'));
		const view = render(<OrganizationForm mode="create" />);
		fillRegistration();
		const form = view.container.querySelector('form');
		if (!form) throw new Error('Expected form.');
		fireEvent.submit(form);
		await waitFor(() =>
			expect(screen.getByRole('alert').textContent).toContain('Review current records'),
		);
		expect(screen.getByRole('button', { name: 'Register Gym' }).hasAttribute('disabled')).toBe(
			true,
		);
		expect(screen.queryByRole('button', { name: 'Reload current records' })).toBeNull();
		expect(screen.getByRole('link', { name: 'Review registry' })).toBeDefined();
	});
	it('sends name-only PATCH and exact If-Match, then blocks a stale edit', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({ error: { code: 'ORGANIZATION_STALE' } }, { status: 412 }),
		);
		const view = render(
			<OrganizationForm mode="edit" organization={organization} etag={organizationEtag} />,
		);
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: 'Power Gym' } });
		const form = view.container.querySelector('form');
		if (!form) throw new Error('Expected form.');
		fireEvent.submit(form);
		await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Reload'));
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			method: 'PATCH',
			body: JSON.stringify({ name: 'Power Gym' }),
			headers: { 'If-Match': organizationEtag },
		});
		expect(screen.getByRole('button', { name: 'Save gym name' }).hasAttribute('disabled')).toBe(
			true,
		);
		expect(router.replace).not.toHaveBeenCalled();
	});
	it('focuses cancellation, confirms the exact lifecycle version and refreshes only on success', async () => {
		fetchMock
			.mockResolvedValueOnce(Response.json(organization))
			.mockResolvedValueOnce(Response.json({ ...organization, status: 'ACTIVE' }));
		render(
			<OrganizationDetails
				organization={organization}
				permissions={Object.values(organizationPermissions)}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Activate gym' }));
		const descriptionId = screen.getByRole('dialog').getAttribute('aria-describedby');
		expect(document.getElementById(descriptionId ?? '')?.textContent).toContain(
			'platform approval',
		);
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
		fireEvent.click(screen.getByRole('button', { name: 'Confirm activation' }));
		await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
		expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
			JSON.stringify({ expectedUpdatedAt: organization.updatedAt }),
		);
		expect(screen.queryByRole('button', { name: 'Suspend gym' })).toBeNull();
	});
	it('refuses a lifecycle change after a newer read and hides all controls for archived gyms', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({ ...organization, updatedAt: '2026-10-13T13:00:00.000Z' }),
		);
		const view = render(
			<OrganizationDetails
				organization={organization}
				permissions={Object.values(organizationPermissions)}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Activate gym' }));
		fireEvent.click(screen.getByRole('button', { name: 'Confirm activation' }));
		await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changed'));
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(router.refresh).not.toHaveBeenCalled();
		view.unmount();
		render(
			<OrganizationDetails
				organization={{ ...organization, status: 'ARCHIVED' }}
				permissions={Object.values(organizationPermissions)}
			/>,
		);
		expect(screen.queryByRole('button', { name: 'Activate gym' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Suspend gym' })).toBeNull();
		expect(screen.queryByRole('button', { name: /delete|archive/i })).toBeNull();
		expect(screen.getByText(/Preview only/)).toBeDefined();
	});

	it('restores trigger focus on cancellation without sending a lifecycle request', () => {
		render(
			<OrganizationDetails
				organization={organization}
				permissions={Object.values(organizationPermissions)}
			/>,
		);
		const trigger = screen.getByRole('button', { name: 'Activate gym' });
		fireEvent.click(trigger);
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.activeElement).toBe(trigger);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('keeps suspension unconfirmed when auditing is unavailable', async () => {
		const active = { ...organization, status: 'ACTIVE' } as const;
		fetchMock
			.mockResolvedValueOnce(Response.json(active))
			.mockResolvedValueOnce(
				Response.json({ error: { code: 'ORGANIZATION_AUDIT_UNAVAILABLE' } }, { status: 503 }),
			);
		render(
			<OrganizationDetails
				organization={active}
				permissions={[organizationPermissions.read, organizationPermissions.suspend]}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Suspend gym' }));
		fireEvent.click(screen.getByRole('button', { name: 'Confirm suspension' }));
		await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('audit setup'));
		expect(screen.getByText('Active')).toBeDefined();
		expect(router.refresh).not.toHaveBeenCalled();
	});
});

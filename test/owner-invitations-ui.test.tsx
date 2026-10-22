// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationList } from '@/components/organizations/organization-list';
import { OwnerInvitationsDialog } from '@/components/organizations/owner-invitations-dialog';
import { ToastProvider } from '@/components/shared/toast';
import { ownerInvitationPermissions } from '@/lib/contracts/owner-invitations';
import { organization } from './organization-fixtures';
import { ownerInvitation } from './owner-invitation-fixtures';
import { csrf } from './fixtures';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const fetchMock = vi.fn<typeof fetch>();
const all = Object.values(ownerInvitationPermissions);

beforeEach(() => {
	fetchMock.mockReset();
	router.replace.mockReset();
	router.refresh.mockReset();
	vi.stubGlobal('fetch', fetchMock);
	document.cookie = `nexcode-platform-csrf=${csrf}; path=/`;
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
	fetchMock.mockImplementation(async () => Response.json({ items: [], nextCursor: null }));
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function management(permissions: readonly string[] = all) {
	return render(
		<ToastProvider>
			<OwnerInvitationsDialog
				organization={organization}
				permissions={permissions}
				onClose={vi.fn()}
			/>
		</ToastProvider>,
	);
}
async function openCreation() {
	fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));
	expect(document.activeElement).toBe(screen.getByLabelText('Owner full name'));
	fireEvent.change(screen.getByLabelText('Owner full name'), { target: { value: 'Aline Uwase' } });
	fireEvent.change(screen.getByLabelText('Owner email address'), {
		target: { value: 'ALINE@EXAMPLE.COM' },
	});
}

describe('owner invitation dialogs', () => {
	it('loads only on explicit management entry and restores focus through gym details', async () => {
		let finishLoading: (response: Response) => void = () => {
			throw new Error('Invitation loading was not started.');
		};
		fetchMock.mockImplementationOnce(
			() =>
				new Promise<Response>((resolve) => {
					finishLoading = resolve;
				}),
		);
		render(
			<ToastProvider>
				<OrganizationList
					data={{ items: [organization], nextCursor: null }}
					query={{ limit: 20 }}
					permissions={all}
				/>
			</ToastProvider>,
		);
		fireEvent.click(screen.getByRole('button', { name: organization.name }));
		expect(fetchMock).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'Manage owner invitations' }));
		expect(fetchMock).toHaveBeenCalledOnce();
		await act(async () => {
			finishLoading(Response.json({ items: [], nextCursor: null }));
			await Promise.resolve();
		});
		expect(screen.getByText('No owner invitations yet')).toBeTruthy();
		expect(screen.getAllByRole('dialog')).toHaveLength(1);
		fireEvent.click(screen.getByRole('button', { name: 'Back to gym' }));
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Manage owner invitations' }),
		);
		fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
		expect(document.activeElement).toBe(screen.getByRole('button', { name: organization.name }));
	}, 10_000);

	it('supports create-only operators without fetching recipient history', async () => {
		management([ownerInvitationPermissions.create]);
		expect(screen.getByText('Invitation history needs permission')).toBeTruthy();
		expect(fetchMock).not.toHaveBeenCalled();
		await openCreation();
		fetchMock.mockResolvedValueOnce(Response.json(ownerInvitation, { status: 201 }));
		fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));
		expect(
			await screen.findByText(
				'Owner invitation created. Send it from the invitation list when ready.',
			),
		).toBeTruthy();
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
		expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
			displayName: 'Aline Uwase',
			email: 'aline@example.com',
		});
	});

	it('hides creation and revocation independently from read permission', async () => {
		fetchMock.mockResolvedValue(Response.json({ items: [ownerInvitation], nextCursor: null }));
		management([ownerInvitationPermissions.read]);
		expect(await screen.findByText(ownerInvitation.email)).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Create invitation' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Revoke invitation' })).toBeNull();
	});

	it('validates fields, prevents repeated creation while pending and requires confirmed 201', async () => {
		management([ownerInvitationPermissions.create]);
		await openCreation();
		fireEvent.change(screen.getByLabelText('Owner full name'), { target: { value: ' ' } });
		fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));
		expect(await screen.findByRole('alert')).toBeTruthy();
		expect(fetchMock).not.toHaveBeenCalled();
		fireEvent.change(screen.getByLabelText('Owner full name'), {
			target: { value: 'Aline Uwase' },
		});
		let finish: (response: Response) => void = () => {
			throw new Error('Submission was not started.');
		};
		fetchMock.mockImplementationOnce(
			() =>
				new Promise<Response>((resolve) => {
					finish = resolve;
				}),
		);
		const submit = screen.getByRole('button', { name: 'Create invitation' });
		fireEvent.click(submit);
		fireEvent.click(submit);
		expect(submit.hasAttribute('disabled')).toBe(true);
		expect(submit.getAttribute('aria-busy')).toBe('true');
		expect(submit.querySelector('[data-loading-indicator]')).toBeTruthy();
		expect(fetchMock).toHaveBeenCalledOnce();
		await act(async () => finish(Response.json(ownerInvitation, { status: 201 })));
		expect(
			await screen.findByText(
				'Owner invitation created. Send it from the invitation list when ready.',
			),
		).toBeTruthy();
	});

	it.each([
		[409, 'OWNER_INVITATION_OUTSTANDING_CONFLICT', 'already exists'],
		[503, 'OWNER_INVITATION_AUDIT_UNAVAILABLE', 'No success has been confirmed'],
	] as const)(
		'preserves form values on %s without false success',
		async (status, code, message) => {
			management([ownerInvitationPermissions.create]);
			await openCreation();
			fetchMock.mockResolvedValueOnce(Response.json({ error: { code } }, { status }));
			fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));
			expect((await screen.findByRole('alert')).textContent).toContain(message);
			expect(screen.getByLabelText('Owner full name')).toHaveProperty('value', 'Aline Uwase');
			expect(
				screen.queryByText(
					'Owner invitation created. Send it from the invitation list when ready.',
				),
			).toBeNull();
		},
	);

	it('keeps status filters when paging and does not invent totals', async () => {
		fetchMock.mockImplementation(async (path) => {
			const url = new URL(String(path), 'http://localhost:4000');
			return Response.json({
				items: [ownerInvitation],
				nextCursor: url.searchParams.has('cursor') ? null : ownerInvitation.id,
			});
		});
		management();
		await screen.findByText(ownerInvitation.email);
		const filters = screen.getByRole('group', { name: 'Invitation status' });
		expect(within(filters).getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe(
			'true',
		);
		expect(within(filters).getAllByRole('button')).toHaveLength(5);
		fireEvent.click(within(filters).getByRole('button', { name: 'Pending delivery' }));
		await screen.findByText(ownerInvitation.email);
		expect(
			within(filters)
				.getByRole('button', { name: 'Pending delivery' })
				.getAttribute('aria-pressed'),
		).toBe('true');
		const reads = fetchMock.mock.calls.length;
		fireEvent.click(within(filters).getByRole('button', { name: 'Pending delivery' }));
		expect(fetchMock).toHaveBeenCalledTimes(reads);
		fireEvent.click(screen.getByRole('button', { name: 'Next results' }));
		await waitFor(() =>
			expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(`cursor=${ownerInvitation.id}`),
		);
		expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('status=PENDING_DELIVERY');
		await screen.findByText(ownerInvitation.email);
		fireEvent.click(screen.getByRole('button', { name: 'Previous results' }));
		await waitFor(() => expect(String(fetchMock.mock.calls.at(-1)?.[0])).not.toContain('cursor='));
		await screen.findByText(ownerInvitation.email);
		fireEvent.click(within(filters).getByRole('button', { name: 'All' }));
		await waitFor(() => expect(String(fetchMock.mock.calls.at(-1)?.[0])).not.toContain('status='));
		expect(String(fetchMock.mock.calls.at(-1)?.[0])).not.toContain('cursor=');
		expect(within(filters).getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe(
			'true',
		);
	});

	it('confirms bodyless revocation and removes the action from revoked records', async () => {
		let revoked = false;
		fetchMock.mockImplementation(async (_path, init) => {
			if (init?.method === 'POST') revoked = true;
			const row = revoked
				? { ...ownerInvitation, status: 'REVOKED', revokedAt: '2026-10-16T09:00:00.000Z' }
				: ownerInvitation;
			return Response.json(init?.method === 'POST' ? row : { items: [row], nextCursor: null });
		});
		management();
		await screen.findByText(ownerInvitation.email);
		fireEvent.click(screen.getByRole('button', { name: 'Revoke invitation' }));
		expect(screen.getAllByRole('dialog')).toHaveLength(1);
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
		fireEvent.click(screen.getByRole('button', { name: 'Revoke invitation' }));
		expect(
			await screen.findByText('Owner invitation revoked. Existing gym ownership was not changed.'),
		).toBeTruthy();
		await screen.findByText('This invitation can no longer be used.');
		expect(screen.queryByRole('button', { name: 'Revoke invitation' })).toBeNull();
		const mutation = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
		expect(mutation?.[1]?.body).toBeUndefined();
	});

	it('keeps the list mounted and shows queued delivery after sending', async () => {
		fetchMock.mockImplementation(async (_path, init) =>
			init?.method === 'POST'
				? Response.json(
						{ status: 'QUEUED', message: 'Invitation delivery has been queued.' },
						{ status: 202 },
					)
				: Response.json({ items: [ownerInvitation], nextCursor: null }),
		);
		management();
		await screen.findByText(ownerInvitation.email);
		fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
		expect(await screen.findByText('Delivery: queued.')).toBeTruthy();
		expect(await screen.findByText('Invitation delivery has been queued.')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Send invitation' })).toBeNull();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('keeps invitation details visible and blocks an unconfirmed send', async () => {
		fetchMock.mockImplementation(async (_path, init) => {
			if (init?.method === 'POST') throw new TypeError('unconfirmed');
			return Response.json({ items: [ownerInvitation], nextCursor: null });
		});
		management();
		await screen.findByText(ownerInvitation.email);
		fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
		expect(await screen.findByRole('alert')).toBeTruthy();
		expect(screen.getByText(ownerInvitation.email)).toBeTruthy();
		expect(screen.queryByText('Invitations unavailable')).toBeNull();
		expect(screen.getByRole('button', { name: 'Send invitation' }).hasAttribute('disabled')).toBe(
			true,
		);
	});

	it('requires a fresh read after an uncertain revocation instead of blindly replaying', async () => {
		fetchMock.mockImplementation(async (_path, init) => {
			if (init?.method === 'POST') throw new TypeError('unconfirmed');
			return Response.json({ items: [ownerInvitation], nextCursor: null });
		});
		management();
		await screen.findByText(ownerInvitation.email);
		fireEvent.click(screen.getByRole('button', { name: 'Revoke invitation' }));
		fireEvent.click(screen.getByRole('button', { name: 'Revoke invitation' }));
		expect(await screen.findByRole('alert')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Revoke invitation' }).hasAttribute('disabled')).toBe(
			true,
		);
		expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
		fireEvent.click(screen.getByRole('button', { name: 'Reload invitations' }));
		await screen.findByText(ownerInvitation.email);
		expect(screen.getByRole('button', { name: 'Revoke invitation' }).hasAttribute('disabled')).toBe(
			false,
		);
	});

	it('does not reopen submission after unconfirmed creation without history access', async () => {
		management([ownerInvitationPermissions.create]);
		await openCreation();
		fetchMock.mockRejectedValueOnce(new TypeError('unconfirmed'));
		fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));
		await screen.findByRole('alert');
		expect(screen.getByRole('button', { name: 'Create invitation' }).hasAttribute('disabled')).toBe(
			true,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Back' }));
		expect(screen.getByRole('button', { name: 'Create invitation' }).hasAttribute('disabled')).toBe(
			true,
		);
		expect(fetchMock).toHaveBeenCalledOnce();
	});
});

// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationForm } from '@/components/organizations/organization-form';
import { OrganizationList } from '@/components/organizations/organization-list';
import { OrganizationDetails } from '@/components/organizations/organization-details';
import { ToastProvider } from '@/components/shared/toast';
import { visibleNavigation } from '@/constants/navigation';
import { organizationPermissions, type Organization } from '@/lib/contracts/organizations';
import { organization, organizationEtag } from './organization-fixtures';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const fetchMock = vi.fn<typeof fetch>();
const allPermissions = Object.values(organizationPermissions);

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

function withToasts(children: ReactNode) {
	return render(<ToastProvider>{children}</ToastProvider>);
}

function formCallbacks() {
	return {
		onClose: vi.fn<() => void>(),
		onReload: vi.fn<() => void>(),
		onSaved: vi.fn<(organization: Organization) => void>(),
	};
}

function submitForm(container: HTMLElement) {
	const form = container.querySelector('form');
	if (!form) throw new Error('Expected native organization form.');
	fireEvent.submit(form);
}

function fillRegistration(slug = 'soho') {
	fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: 'Soho Gym' } });
	fireEvent.change(screen.getByLabelText('Slug'), { target: { value: slug } });
}

function renderList(items: readonly Organization[] = [organization], permissions = allPermissions) {
	return withToasts(
		<OrganizationList
			data={{ items: [...items], nextCursor: null }}
			query={{ limit: 20 }}
			permissions={permissions}
		/>,
	);
}

describe('shared organization form dialog', () => {
	it('opens as a labelled modal dialog with the gym name focused', () => {
		render(<OrganizationForm mode="create" {...formCallbacks()} />);
		const dialog = screen.getByRole('dialog', { name: 'Register Gym' });
		expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
		expect(document.activeElement).toBe(screen.getByLabelText('Gym name'));
	});

	it('generates a slug as the name changes without making requests', () => {
		render(<OrganizationForm mode="create" {...formCallbacks()} />);
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: 'Soho Gym' } });
		expect(screen.getByLabelText('Slug')).toHaveProperty('value', 'soho-gym');
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: 'Élite Fitness' } });
		expect(screen.getByLabelText('Slug')).toHaveProperty('value', 'elite-fitness');
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: '' } });
		expect(screen.getByLabelText('Slug')).toHaveProperty('value', '');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('preserves a manual slug until the user chooses to derive it from the name again', () => {
		render(<OrganizationForm mode="create" {...formCallbacks()} />);
		fillRegistration('soho-kigali');
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: 'Soho Fitness' } });
		expect(screen.getByLabelText('Slug')).toHaveProperty('value', 'soho-kigali');
		fireEvent.click(screen.getByRole('button', { name: 'Use gym name' }));
		expect(screen.getByLabelText('Slug')).toHaveProperty('value', 'soho-fitness');
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: 'Soho Fitness Club' } });
		expect(screen.getByLabelText('Slug')).toHaveProperty('value', 'soho-fitness-club');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('submits the generated slug and reports only the confirmed record', async () => {
		const created = { ...organization, slug: 'soho-gym' };
		fetchMock.mockResolvedValueOnce(Response.json(created, { status: 201 }));
		const callbacks = formCallbacks();
		const view = render(<OrganizationForm mode="create" {...callbacks} />);
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: 'Soho Gym' } });
		submitForm(view.container);
		await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledWith(created));
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			method: 'POST',
			body: JSON.stringify({ name: 'Soho Gym', slug: 'soho-gym' }),
		});
		expect(router.replace).not.toHaveBeenCalled();
	});

	it('associates create validation errors with both fields without sending a request', () => {
		const view = render(<OrganizationForm mode="create" {...formCallbacks()} />);
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: '   ' } });
		fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'admin' } });
		submitForm(view.container);
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

	it('shows an edit name validation error without a slug field or a request', () => {
		const view = render(
			<OrganizationForm mode="edit" organization={organization} {...formCallbacks()} />,
		);
		expect(screen.getByRole('dialog', { name: 'Edit gym name' })).toBeDefined();
		expect(screen.getByLabelText('Gym name')).toHaveProperty('value', 'Soho Gym');
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: '   ' } });
		submitForm(view.container);
		expect(screen.getByLabelText('Gym name').getAttribute('aria-invalid')).toBe('true');
		expect(screen.queryByLabelText('Slug')).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each(['admin', 'Soho', 'soho--gym'])(
		'rejects invalid registration slug %s without a request',
		(slug) => {
			const view = render(<OrganizationForm mode="create" {...formCallbacks()} />);
			fillRegistration(slug);
			submitForm(view.container);
			expect(screen.getByRole('alert').textContent).toContain('Check');
			expect(fetchMock).not.toHaveBeenCalled();
		},
	);

	it('prevents duplicates, locks dismissal while pending and saves only after a genuine 201', async () => {
		let resolve: (value: Response) => void = () => {
			throw new Error('Deferred request not initialized.');
		};
		fetchMock.mockImplementationOnce(
			() =>
				new Promise<Response>((done) => {
					resolve = done;
				}),
		);
		const callbacks = formCallbacks();
		const view = render(<OrganizationForm mode="create" {...callbacks} />);
		fillRegistration();
		submitForm(view.container);
		submitForm(view.container);
		const button = screen.getByRole('button', { name: 'Register Gym' });
		expect(button.hasAttribute('disabled')).toBe(true);
		expect(button.querySelector('[data-loading-indicator]')).not.toBeNull();
		expect(screen.getByRole('button', { name: 'Close' }).hasAttribute('disabled')).toBe(true);
		fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
		expect(callbacks.onClose).not.toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(callbacks.onSaved).not.toHaveBeenCalled();
		await act(async () => {
			resolve(Response.json(organization, { status: 201 }));
		});
		expect(callbacks.onSaved).toHaveBeenCalledWith(organization);
	});

	it.each([
		[409, 'ORGANIZATION_SLUG_CONFLICT', 'already registered'],
		[503, 'ORGANIZATION_AUDIT_UNAVAILABLE', 'audit setup'],
	] as const)('shows safe registration failure %s without success', async (status, code, message) => {
		fetchMock.mockResolvedValueOnce(
			Response.json({ error: { code, message: 'secret provider text' } }, { status }),
		);
		const callbacks = formCallbacks();
		const view = render(<OrganizationForm mode="create" {...callbacks} />);
		fillRegistration();
		submitForm(view.container);
		await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(message));
		expect(screen.queryByText(/secret provider text/u)).toBeNull();
		expect(callbacks.onSaved).not.toHaveBeenCalled();
		expect(screen.getByLabelText('Gym name').getAttribute('disabled')).toBeNull();
	});

	it('blocks an ambiguous creation until the administrator reviews the registry', async () => {
		fetchMock.mockRejectedValueOnce(new Error('Private network diagnostics'));
		const callbacks = formCallbacks();
		const view = render(<OrganizationForm mode="create" {...callbacks} />);
		fillRegistration();
		submitForm(view.container);
		await waitFor(() =>
			expect(screen.getByRole('alert').textContent).toContain('Review current records'),
		);
		expect(screen.getByRole('button', { name: 'Register Gym' }).hasAttribute('disabled')).toBe(
			true,
		);
		expect(screen.queryByRole('button', { name: 'Reload current records' })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Review registry' }));
		expect(callbacks.onReload).toHaveBeenCalledOnce();
		expect(callbacks.onSaved).not.toHaveBeenCalled();
	});

	it('sends a name-only PATCH with the opened version as If-Match, then blocks a stale edit', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({ error: { code: 'ORGANIZATION_STALE' } }, { status: 412 }),
		);
		const callbacks = formCallbacks();
		const view = render(<OrganizationForm mode="edit" organization={organization} {...callbacks} />);
		fireEvent.change(screen.getByLabelText('Gym name'), { target: { value: 'Power Gym' } });
		submitForm(view.container);
		await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Reload'));
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			method: 'PATCH',
			body: JSON.stringify({ name: 'Power Gym' }),
			headers: { 'If-Match': organizationEtag },
		});
		expect(screen.getByRole('button', { name: 'Save gym name' }).hasAttribute('disabled')).toBe(
			true,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Reload current records' }));
		expect(callbacks.onReload).toHaveBeenCalledOnce();
		expect(callbacks.onSaved).not.toHaveBeenCalled();
	});
});

describe('organization card registry', () => {
	it('renders an honest empty state and hides registration without permission', () => {
		withToasts(
			<OrganizationList
				data={{ items: [], nextCursor: null }}
				query={{ limit: 20 }}
				permissions={[organizationPermissions.read]}
			/>,
		);
		expect(screen.getByText('No gyms registered yet')).toBeDefined();
		expect(screen.queryByRole('button', { name: 'Register Gym' })).toBeNull();
		expect(screen.queryByRole('list')).toBeNull();
		expect(visibleNavigation(['platform.owner'])).toHaveLength(0);
		expect(visibleNavigation([organizationPermissions.read]).map((entry) => entry.key)).toEqual([
			'organizations',
		]);
	});

	it('renders real records as cards without page links or edit access by default', () => {
		const second = {
			...organization,
			id: '4f1c51c4-2fd1-4b9f-9a8e-0c2f6b3c8d11',
			name: 'Kigali Fit',
			slug: 'kigali-fit',
		};
		renderList([organization, second], [organizationPermissions.read]);
		const [first] = within(screen.getByRole('list')).getAllByRole('article');
		expect(within(screen.getByRole('list')).getAllByRole('article')).toHaveLength(2);
		if (!first) throw new Error('Expected organization cards.');
		expect(within(first).getByRole('button', { name: 'Soho Gym' })).toBeDefined();
		expect(within(first).getByText('soho')).toBeDefined();
		expect(screen.getByRole('status').textContent).toBe('2 gyms in this view');
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.queryByRole('button', { name: /^Edit /u })).toBeNull();
	});

	it('preserves status on the next cursor and resets the cursor when filtering', () => {
		withToasts(
			<OrganizationList
				data={{ items: [organization], nextCursor: organization.id }}
				query={{ limit: 20, status: 'PENDING' }}
				permissions={allPermissions}
			/>,
		);
		expect(screen.getByRole('button', { name: 'Pending' }).getAttribute('aria-pressed')).toBe(
			'true',
		);
		fireEvent.click(screen.getByRole('button', { name: 'Next results' }));
		expect(router.replace).toHaveBeenCalledWith(
			`/organizations?limit=20&status=PENDING&cursor=${organization.id}`,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Active' }));
		expect(router.replace).toHaveBeenLastCalledWith('/organizations?limit=20&status=ACTIVE');
		fireEvent.click(screen.getByRole('button', { name: 'All' }));
		expect(router.replace).toHaveBeenLastCalledWith('/organizations?limit=20');
	});

	it('registers in a dialog, then closes it, shows a success toast and refreshes', async () => {
		fetchMock.mockResolvedValueOnce(Response.json(organization, { status: 201 }));
		renderList([]);
		const trigger = screen.getByRole('button', { name: 'Register Gym' });
		fireEvent.click(trigger);
		const dialog = screen.getByRole('dialog', { name: 'Register Gym' });
		fireEvent.change(within(dialog).getByLabelText('Gym name'), { target: { value: 'Soho Gym' } });
		submitForm(dialog);
		await waitFor(() =>
			expect(screen.getByText('Soho Gym was registered as a pending gym.')).toBeDefined(),
		);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(router.refresh).toHaveBeenCalledOnce();
		expect(document.activeElement).toBe(trigger);
	});

	it('edits from the card action and confirms the saved name in a toast', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ ...organization, name: 'Power Gym' }));
		renderList();
		fireEvent.click(screen.getByRole('button', { name: 'Edit Soho Gym' }));
		const dialog = screen.getByRole('dialog', { name: 'Edit gym name' });
		fireEvent.change(within(dialog).getByLabelText('Gym name'), { target: { value: 'Power Gym' } });
		submitForm(dialog);
		await waitFor(() => expect(screen.getByText('Gym name saved as Power Gym.')).toBeDefined());
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			headers: { 'If-Match': organizationEtag },
		});
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(router.refresh).toHaveBeenCalledOnce();
	});

	it('opens details from the card, switches to editing and restores card focus on close', () => {
		renderList();
		const card = screen.getByRole('button', { name: 'Soho Gym' });
		fireEvent.click(card);
		const details = screen.getByRole('dialog', { name: 'Soho Gym' });
		expect(within(details).getByText(organization.id)).toBeDefined();
		expect(within(details).getByText(/Preview only/u)).toBeDefined();
		fireEvent.click(within(details).getByRole('button', { name: 'Edit gym name' }));
		expect(screen.queryByRole('dialog', { name: 'Soho Gym' })).toBeNull();
		const edit = screen.getByRole('dialog', { name: 'Edit gym name' });
		fireEvent.click(within(edit).getByRole('button', { name: 'Cancel' }));
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.activeElement).toBe(card);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('closes from the backdrop and Escape but not from a press that ends on the backdrop', () => {
		renderList();
		fireEvent.click(screen.getByRole('button', { name: 'Soho Gym' }));
		const dialog = screen.getByRole('dialog', { name: 'Soho Gym' });
		fireEvent.pointerDown(within(dialog).getByText(organization.id));
		fireEvent.click(dialog);
		expect(screen.getByRole('dialog', { name: 'Soho Gym' })).toBeDefined();
		fireEvent.pointerDown(dialog);
		fireEvent.click(dialog);
		expect(screen.queryByRole('dialog')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Soho Gym' }));
		fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});

describe('organization lifecycle confirmation', () => {
	function renderDetails(record: Organization = organization, permissions = allPermissions) {
		const callbacks = {
			onClose: vi.fn<() => void>(),
			onEdit: vi.fn<() => void>(),
			onReload: vi.fn<() => void>(),
			onLifecycleChange: vi.fn<(row: Organization, action: string) => void>(),
		};
		const view = render(
			<OrganizationDetails organization={record} permissions={permissions} {...callbacks} />,
		);
		return { ...callbacks, view };
	}

	it('focuses cancellation and confirms the exact lifecycle version before reporting success', async () => {
		const activated = { ...organization, status: 'ACTIVE' } as const;
		fetchMock
			.mockResolvedValueOnce(Response.json(organization))
			.mockResolvedValueOnce(Response.json(activated));
		const { onLifecycleChange } = renderDetails();
		fireEvent.click(screen.getByRole('button', { name: 'Activate gym' }));
		const confirm = screen.getByRole('dialog', { name: 'Activate Soho Gym?' });
		const descriptionId = confirm.getAttribute('aria-describedby');
		expect(document.getElementById(descriptionId ?? '')?.textContent).toContain(
			'platform approval',
		);
		expect(document.activeElement).toBe(within(confirm).getByRole('button', { name: 'Cancel' }));
		fireEvent.click(within(confirm).getByRole('button', { name: 'Confirm activation' }));
		await waitFor(() => expect(onLifecycleChange).toHaveBeenCalledWith(activated, 'activation'));
		expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
			JSON.stringify({ expectedUpdatedAt: organization.updatedAt }),
		);
		expect(screen.queryByRole('dialog', { name: 'Activate Soho Gym?' })).toBeNull();
	});

	it('closes details and announces a confirmed activation from the registry', async () => {
		fetchMock
			.mockResolvedValueOnce(Response.json(organization))
			.mockResolvedValueOnce(Response.json({ ...organization, status: 'ACTIVE' }));
		renderList();
		fireEvent.click(screen.getByRole('button', { name: 'Soho Gym' }));
		fireEvent.click(screen.getByRole('button', { name: 'Activate gym' }));
		fireEvent.click(screen.getByRole('button', { name: 'Confirm activation' }));
		await waitFor(() => expect(screen.getByText('Soho Gym is now active.')).toBeDefined());
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(router.refresh).toHaveBeenCalledOnce();
	});

	it('refuses a lifecycle change after a newer read and hides all controls for archived gyms', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({ ...organization, updatedAt: '2026-10-13T13:00:00.000Z' }),
		);
		const first = renderDetails();
		fireEvent.click(screen.getByRole('button', { name: 'Activate gym' }));
		fireEvent.click(screen.getByRole('button', { name: 'Confirm activation' }));
		await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changed'));
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(first.onLifecycleChange).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'Reload gym' }));
		expect(first.onReload).toHaveBeenCalledOnce();
		first.view.unmount();
		renderDetails({ ...organization, status: 'ARCHIVED' });
		expect(screen.queryByRole('button', { name: 'Activate gym' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Suspend gym' })).toBeNull();
		expect(screen.queryByRole('button', { name: /delete|archive/iu })).toBeNull();
		expect(screen.getByText(/Preview only/u)).toBeDefined();
	});

	it('restores trigger focus on cancellation without sending a lifecycle request', () => {
		renderDetails();
		const trigger = screen.getByRole('button', { name: 'Activate gym' });
		fireEvent.click(trigger);
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(screen.queryByRole('dialog', { name: 'Activate Soho Gym?' })).toBeNull();
		expect(screen.getByRole('dialog', { name: 'Soho Gym' })).toBeDefined();
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
		const { onLifecycleChange } = renderDetails(active, [
			organizationPermissions.read,
			organizationPermissions.suspend,
		]);
		expect(screen.queryByRole('button', { name: 'Edit gym name' })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Suspend gym' }));
		fireEvent.click(screen.getByRole('button', { name: 'Confirm suspension' }));
		await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('audit setup'));
		expect(onLifecycleChange).not.toHaveBeenCalled();
		expect(router.refresh).not.toHaveBeenCalled();
	});
});
